import { fetchNBURates, saveRates } from '@/utilities/exchangeRates'
import { calcCurrencyPrices, calcPrices, calcVariantPrices } from '@/utilities/prices'
import type { Payload } from 'payload'

// Достаём id из связи (бывает либо id, либо объект с id)
const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

export async function updateAllPrices(payload: Payload) {
  const rates = await fetchNBURates()
  await saveRates(payload, rates)

  const now = new Date()

  // Товары: цена сейчас и обычная цена по датам скидки
  const { docs: products } = await payload.find({
    collection: 'products',
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  // Свежие цены товаров: по ним потом считаем варианты без своей цены
  const productPrices = new Map<string, Record<string, any>>()
  let productsUpdated = 0

  for (const product of products) {
    const next = calcPrices(product, rates, now)
    productPrices.set(String(product.id), { ...product, ...next })

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

  // Варианты: со своей ценой или без неё (берём цену товара)
  const { docs: variants } = await payload.find({
    collection: 'variants',
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  let variantsUpdated = 0

  for (const variant of variants) {
    const item = variant as Record<string, any>
    const productId = idOf(item.product)
    const product = productId ? (productPrices.get(productId) ?? null) : null

    const prices = calcVariantPrices({ item, product, rates, now })
    if (!prices) continue

    const converted = calcCurrencyPrices(prices.priceInUAH, rates)

    if (item.priceInUAH !== converted.priceInUAH || item.regularPriceUAH !== prices.regularPriceUAH) {
      await payload.update({
        collection: 'variants',
        id: variant.id,
        data: {
          regularPriceUAH: prices.regularPriceUAH,
          ...converted,
        },
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