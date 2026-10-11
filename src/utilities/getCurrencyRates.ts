export interface ExchangeRate {
  cc: string // 'USD' | 'EUR'
  rate: number
}

let cachedRates: { [key: string]: number } = { USD: 41.5, EUR: 45.0, UAH: 1 }
let lastFetchTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 часа

export async function getNBURates(): Promise<{ [key: string]: number }> {
  const now = Date.now()
  // Обновляем курс, если прошло больше 24 часов
  if (now - lastFetchTime < CACHE_TTL && Object.keys(cachedRates).length > 0) {
    return cachedRates
  }

  try {
    const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json', {
      next: { revalidate: 3600 },
    })
    const data: ExchangeRate[] = await res.json()

    const usd = data.find((item) => item.cc === 'USD')?.rate || cachedRates.USD
    const eur = data.find((item) => item.cc === 'EUR')?.rate || cachedRates.EUR

    cachedRates = { USD: usd, EUR: eur, UAH: 1 }
    lastFetchTime = now
  } catch (error) {
    console.error('Ошибка загрузки курсов НБУ:', error)
  }

  return cachedRates
}

export function convertToUAH(amount: number, currency: 'UAH' | 'USD' | 'EUR', rates: { [key: string]: number }): number {
  if (currency === 'UAH' || !rates[currency]) return amount
  // Округляем в большую сторону до целых гривен
  return Math.ceil(amount * rates[currency])
}