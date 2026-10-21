import configPromise from '@payload-config'
import { getPayload } from 'payload'

const API_URL = 'https://api.novaposhta.ua/v2.0/json/'

export interface NPCity {
  Ref: string
  Present: string
  DeliveryCity: string
}

export interface NPWarehouse {
  Ref: string
  Description: string
  Number: string
}

// Ошибка Новой почты: нет ключа, сеть недоступна или API вернул ошибку.
// Маршрут видит её и отвечает кодом 502, а страница показывает сообщение клиенту.
export class NovaPoshtaError extends Error {}

type NPResponse<T> = {
  success: boolean
  data?: T[]
  errors?: string[]
}

async function callNovaPoshta<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, string>,
): Promise<T[]> {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
  const apiKey = settings.novaPoshtaApiKey

  if (!apiKey) {
    payload.logger.warn('Nova Poshta request skipped: API key is not configured')
    throw new NovaPoshtaError('API key is not configured')
  }

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    })
  } catch (error) {
    throw new NovaPoshtaError(`Network error: ${String(error)}`)
  }

  if (!response.ok) {
    throw new NovaPoshtaError(`Nova Poshta returned HTTP ${response.status}`)
  }

  const data = (await response.json()) as NPResponse<T>
  if (!data.success) {
    throw new NovaPoshtaError(data.errors?.join('; ') || 'Nova Poshta returned an error')
  }

  return data.data ?? []
}

// Поиск городов по введенным буквам
export async function searchCities(query: string): Promise<NPCity[]> {
  if (!query || query.trim().length < 2) return []

  const rows = await callNovaPoshta<{
    Addresses?: { Present: string; DeliveryCity: string }[]
  }>('Address', 'searchSettlements', {
    CityName: query.trim(),
    Limit: '10',
  })

  return (rows[0]?.Addresses ?? []).map((item) => ({
    Ref: item.DeliveryCity,
    Present: item.Present,
    DeliveryCity: item.DeliveryCity,
  }))
}

// Отделения и поштоматы выбранного города
export async function getWarehouses(cityRef: string): Promise<NPWarehouse[]> {
  if (!cityRef) return []

  const rows = await callNovaPoshta<NPWarehouse>('Address', 'getWarehouses', {
    CityRef: cityRef,
    Limit: '500',
  })

  return rows.map((item) => ({
    Ref: item.Ref,
    Description: item.Description,
    Number: item.Number,
  }))
}