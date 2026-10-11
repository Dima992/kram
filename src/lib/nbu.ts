export interface NBURate {
  r030: number
  txt: string
  rate: number
  cc: string
  exchangedate: string
}

const cachedRates: { [key: string]: number } = {
  USD: 41.5, // Фолбэк-курс на случай сбоя API НБУ
  EUR: 45.0,
  UAH: 1.0,
}

let lastFetchTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 часа кеширования

/**
 * Получает актуальные курсы НБУ (USD, EUR) с кешированием на 24 часа
 */
export async function getNBURates(): Promise<{ [key: string]: number }> {
  const now = Date.now()

  // Если кеш свежий — отдаем данные из памяти
  if (now - lastFetchTime < CACHE_TTL && lastFetchTime !== 0) {
    return cachedRates
  }

  try {
    const res = await fetch(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json',
      {
        next: { revalidate: 3600 }, // Next.js fetch cache
      }
    )

    if (!res.ok) throw new Error('Failed to fetch NBU rates')

    const data: NBURate[] = await res.json()

    const usd = data.find((item) => item.cc === 'USD')?.rate
    const eur = data.find((item) => item.cc === 'EUR')?.rate

    if (usd) cachedRates.USD = usd
    if (eur) cachedRates.EUR = eur
    cachedRates.UAH = 1.0

    lastFetchTime = now
    console.log('[NBU Rates Updated]', cachedRates)

    return cachedRates
  } catch (error) {
    console.error('Ошибка получения курса НБУ, используем кеш/фолбэк:', error)
    return cachedRates
  }
}

/**
 * Конвертирует любую сумму из исходной валюты (USD, EUR, UAH) в UAH
 */
export async function convertToUAH(amount: number, currency: 'UAH' | 'USD' | 'EUR' = 'UAH'): Promise<number> {
  if (currency === 'UAH' || !amount) return amount

  const rates = await getNBURates()
  const rate = rates[currency] || 1

  // Округляем до целых гривен (или до 2 знаков, если нужно)
  return Math.round(amount * rate)
}