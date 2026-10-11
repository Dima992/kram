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

// Поиск городов по введенным буквам
export async function searchCities(query: string): Promise<NPCity[]> {
  if (!query || query.length < 2) return []

  try {
    const payload = await getPayload({ config: configPromise })
    const { novaPoshtaApiKey } = await payload.findGlobal({
      slug: 'site-settings',
      overrideAccess: true,
    })
    if (!novaPoshtaApiKey) {
      payload.logger.warn('Nova Poshta city search skipped: API key is not configured')
      return []
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: novaPoshtaApiKey,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: {
          CityName: query,
          Limit: '10',
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(`Nova Poshta returned HTTP ${response.status}`)
    if (!data.success || !data.data?.[0]?.Addresses) return []

    return data.data[0].Addresses.map((item: any) => ({
      Ref: item.DeliveryCity,
      Present: item.Present,
      DeliveryCity: item.DeliveryCity,
    }))
  } catch (error) {
    console.error('Ошибка поиска городов НП:', error)
    return []
  }
}

// Получение списка отделений и поштоматов выбранного города
export async function getWarehouses(cityRef: string): Promise<NPWarehouse[]> {
  if (!cityRef) return []

  try {
    const payload = await getPayload({ config: configPromise })
    const { novaPoshtaApiKey } = await payload.findGlobal({
      slug: 'site-settings',
      overrideAccess: true,
    })
    if (!novaPoshtaApiKey) {
      payload.logger.warn('Nova Poshta warehouse search skipped: API key is not configured')
      return []
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: novaPoshtaApiKey,
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties: {
          CityRef: cityRef,
          Limit: '500',
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(`Nova Poshta returned HTTP ${response.status}`)
    if (!data.success || !data.data) return []

    return data.data.map((item: any) => ({
      Ref: item.Ref,
      Description: item.Description,
      Number: item.Number,
    }))
  } catch (error) {
    console.error('Ошибка загрузки отделений НП:', error)
    return []
  }
}