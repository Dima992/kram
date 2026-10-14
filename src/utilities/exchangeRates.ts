import type { Payload } from 'payload';

export type Rates = { USD: number; EUR: number }

export async function fetchNBURates(): Promise<Rates> {
  const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json', {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Курс НБУ недоступен')

  const data = (await res.json()) as { cc: string; rate: number }[]
  const usd = data.find((item) => item.cc === 'USD')?.rate
  const eur = data.find((item) => item.cc === 'EUR')?.rate
  if (!usd || !eur) throw new Error('Не знайдено курс USD або EUR')

  return { USD: usd, EUR: eur }
}

export async function saveRates(payload: Payload, rates: Rates) {
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      usdRate: rates.USD,
      eurRate: rates.EUR,
      ratesUpdatedAt: new Date().toISOString(),
    } as any,
    overrideAccess: true,
  })
}

export async function getStoredRates(payload: Payload): Promise<Rates> {
  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>

  const usd = Number(settings.usdRate)
  const eur = Number(settings.eurRate)
  if (!usd || !eur) {
    throw new Error('Курс валют ещё не загружен. Запустите обновление курса (диспетчер).')
  }

  return { USD: usd, EUR: eur }
}