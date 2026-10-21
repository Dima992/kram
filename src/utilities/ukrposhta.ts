import configPromise from '@payload-config'
import { getPayload } from 'payload'

// Адресний класифікатор Укрпошти (документація v3.22).
// Адреса обов'язково з www, інакше сервіс може не відповісти.
const BASE_URL = 'https://www.ukrposhta.ua/address-classifier-ws'
const TIMEOUT_MS = 8000

// Ошибка Укрпошты: нет токена, сеть недоступна или сервис ответил ошибкой.
// Маршрут видит её и отвечает кодом 502, страница покажет сообщение клиенту.
export class UkrposhtaError extends Error {}

export interface UkrposhtaCity {
  regionId: string
  id: string
  name: string
  type: string
  region: string
  label: string
}

export interface UkrposhtaOffice {
  id: string
  postcode: string
  name: string
  address: string
}

type Row = Record<string, unknown>

// Сервис возвращает либо список записей, либо одну запись без списка
function toRows(data: unknown): Row[] {
  const entries = (data as { Entries?: { Entry?: unknown } } | null)?.Entries?.Entry
  if (Array.isArray(entries)) return entries as Row[]
  if (entries && typeof entries === 'object') return [entries as Row]
  return []
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

async function getToken(): Promise<string> {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
  const token = settings.ukrposhtaApiToken
  if (!token) {
    payload.logger.warn('Ukrposhta request skipped: API token is not configured')
    throw new UkrposhtaError('Ukrposhta token is not configured')
  }
  return token
}

// Один запрос с одним повтором при временном сбое (документация советует повторять с паузой)
async function request(method: string, params: Record<string, string>): Promise<unknown> {
  const token = await getToken()
  const url = `${BASE_URL}/${method}?${new URLSearchParams(params).toString()}`

  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (response.ok) return await response.json()

      lastError = new UkrposhtaError(`Ukrposhta returned HTTP ${response.status}`)
      // Ошибки 4xx (кроме 429) повторять бессмысленно: токен или запрос неверны
      if (response.status < 500 && response.status !== 429) break
    } catch (error) {
      lastError = error
    }
    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 700))
  }

  if (lastError instanceof UkrposhtaError) throw lastError
  throw new UkrposhtaError(`Network error: ${String(lastError)}`)
}

// Поиск населённых пунктов по названию (от 2 букв)
export async function searchCities(query: string): Promise<UkrposhtaCity[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const data = await request('get_city_by_region_id_and_district_id_and_city_ua', { city_ua: q })

  return toRows(data)
    .slice(0, 10)
    .map((row) => {
      const name = text(row.CITY_UA)
      const type = text(row.SHORTCITYTYPE_UA)
      const region = text(row.REGION_UA)
      return {
        id: text(row.CITY_ID),
        regionId: text(row.REGION_ID),
        name,
        type,
        region,
        label: [type, name, region ? `(${region})` : ''].filter(Boolean).join(' '),
      }
    })
    .filter((city) => city.id && city.name)
}

// Отделения населённого пункта. Заблокированные записи и закрытые установки не показываем.
export async function getOffices(cityId: string, regionId: string): Promise<UkrposhtaOffice[]> {
  if (!cityId || !regionId) return []

  const data = await request('get_postoffices_by_city_id', {
    city_id: cityId,
    region_id: regionId,
  })

  return toRows(data)
    .filter((row) => !text(row.LOCK_CODE) || text(row.LOCK_CODE) === '0')
    .filter((row) => text(row.IS_SECURITY) !== '1')
    .map((row) => ({
      id: text(row.ID),
      postcode: text(row.POSTINDEX),
      name: text(row.PO_SHORT),
      address: text(row.ADDRESS),
    }))
    .filter((office) => office.id && office.postcode)
    .sort((a, b) => a.postcode.localeCompare(b.postcode))
}