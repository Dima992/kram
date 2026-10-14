import { fetchNBURates, saveRates, type Rates } from '@/utilities/exchangeRates'
import type { Payload } from 'payload'

type Currency = 'UAH' | 'USD' | 'EUR'

const rateOf = (rates: Rates, currency: Currency): number | undefined => {
  if (currency === 'UAH') return 1
  return rates[currency]
}

export async function updateAllPrices(payload: Payload) {
  const rates = await fetchNBURates()
  await saveRates(payload, rates)

  const { docs: products } = await payload.find({
    collection: 'products',
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  let productsUpdated = 0
  for (const product of products) {
    const currency = (product.baseCurrency || 'UAH') as Currency
    const rate = rateOf(rates, currency) ?? 1
    const priceInUAH = Math.ceil((product.basePrice || 0) * rate)

    if (product.priceInUAH !== priceInUAH) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: { priceInUAH },
        context: { disableRevalidate: true },
        overrideAccess: true,
      })
      productsUpdated++
    }
  }

  const { docs: variants } = await payload.find({
    collection: 'variants',
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
    where: { basePrice: { exists: true } },
  })

  let variantsUpdated = 0
  for (const variant of variants) {
    const item = variant as typeof variant & { basePrice?: number | null; baseCurrency?: string }
    if (typeof item.basePrice !== 'number' || item.basePrice <= 0) continue

    const currency = (item.baseCurrency || 'UAH') as Currency
    const rate = rateOf(rates, currency)
    if (!rate) continue

    const priceInUAH = Math.ceil(item.basePrice * rate)
    const priceInUSD = Math.round((priceInUAH / rates.USD) * 100) / 100
    const priceInEUR = Math.round((priceInUAH / rates.EUR) * 100) / 100

    if (item.priceInUAH !== priceInUAH) {
      await payload.update({
        collection: 'variants',
        id: item.id,
        data: { priceInUAH, priceInUSD, priceInEUR },
        context: { disableRevalidate: true },
        overrideAccess: true,
      })
      variantsUpdated++
    }
  }

  return {
    rates,
    products: { checked: products.length, updated: productsUpdated },
    variants: { checked: variants.length, updated: variantsUpdated },
  }
}