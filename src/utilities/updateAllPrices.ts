import { fetchNBURates, saveRates } from '@/utilities/exchangeRates'
import { calcPrices, calcRegularUAH } from '@/utilities/prices'
import type { Payload } from 'payload'

type Currency = 'UAH' | 'USD' | 'EUR'

export async function updateAllPrices(payload: Payload) {
  const rates = await fetchNBURates()
  await saveRates(payload, rates)

  const now = new Date()

  // Товары: цена сейчас и обычная цена пересчитываются по датам скидки
  const { docs: products } = await payload.find({
    collection: 'products',
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  let productsUpdated = 0
  for (const product of products) {
    const next = calcPrices(product, rates, now)

    if (product.priceInUAH !== next.priceInUAH || product.regularPriceUAH !== next.regularPriceUAH) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: next,
        context: { disableRevalidate: true },
        overrideAccess: true,
      })
      productsUpdated++
    }
  }

  // Варианты: пока без своих скидок, цена считается как раньше (по базовой цене и курсу)
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
    if (currency !== 'UAH' && !rates[currency as 'USD' | 'EUR']) continue

    const priceInUAH = calcRegularUAH(item, rates)
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