import type { Rates } from '@/utilities/exchangeRates'
import { isSaleActive } from '@/utilities/sale'

type Currency = 'UAH' | 'USD' | 'EUR'

type BaseFields = {
  basePrice?: number | null
  baseCurrency?: string | null
}

type SaleFields = {
  salePriceUAH?: number | null
  saleStartsAt?: string | null
  saleEndsAt?: string | null
}

// Обычная цена в гривнах: из базовой цены и курса НБУ
export const calcRegularUAH = (item: BaseFields, rates: Rates): number => {
  const basePrice = Number(item.basePrice) || 0
  if (!basePrice) return 0

  const currency = (item.baseCurrency || 'UAH') as Currency
  if (currency === 'UAH') return basePrice

  const rate = currency === 'USD' ? rates.USD : rates.EUR
  return Math.ceil(basePrice * rate)
}

// Цена в гривнах, которая действует сейчас: скидочная, если скидка идёт по датам
const currentUAH = (regularPriceUAH: number, sale: SaleFields, now: Date): number => {
  const onSale = isSaleActive({ regularPriceUAH, priceInUAH: regularPriceUAH, ...sale }, now)
  return onSale ? Number(sale.salePriceUAH) : regularPriceUAH
}

// Товар: обычная цена и цена, которая действует сейчас
export const calcPrices = (item: BaseFields & SaleFields, rates: Rates, now: Date = new Date()) => {
  const regularPriceUAH = calcRegularUAH(item, rates)
  return {
    regularPriceUAH,
    priceInUAH: currentUAH(regularPriceUAH, item, now),
  }
}

// Вариант: со своей ценой считаем по его цене и его скидке.
// Без своей цены берём цену товара вместе с его скидкой.
export const calcVariantPrices = ({
  item,
  product,
  rates,
  now = new Date(),
}: {
  item: BaseFields & SaleFields
  product: ({ regularPriceUAH?: number | null } & SaleFields) | null
  rates: Rates
  now?: Date
}): { regularPriceUAH: number; priceInUAH: number } | null => {
  if (Number(item.basePrice) > 0) {
    return calcPrices(item, rates, now)
  }

  if (!product) return null

  const regularPriceUAH = Number(product.regularPriceUAH) || 0
  if (!regularPriceUAH) return null

  return {
    regularPriceUAH,
    priceInUAH: currentUAH(regularPriceUAH, product, now),
  }
}

// Цены варианта в трёх валютах по курсу НБУ (одно место для расчёта долларов и евро)
export const calcCurrencyPrices = (priceInUAH: number, rates: Rates) => ({
  priceInUAH,
  priceInUSD: Math.round((priceInUAH / rates.USD) * 100) / 100,
  priceInEUR: Math.round((priceInUAH / rates.EUR) * 100) / 100,
})