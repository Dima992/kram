type SaleFields = {
  priceInUAH?: number | null
  regularPriceUAH?: number | null
  salePriceUAH?: number | null
  saleStartsAt?: string | null
  saleEndsAt?: string | null
}

export type SaleInfo = {
  oldPrice: number
  newPrice: number
  percent: number
  endsAt: string | null
}

// Обычная цена: новое поле, а у старых товаров его ещё нет, тогда берём priceInUAH
const regularOf = (item: SaleFields): number =>
  Number(item.regularPriceUAH ?? item.priceInUAH) || 0

// Идёт ли скидка сейчас (по датам и по цене)
export const isSaleActive = (item: SaleFields, now: Date = new Date()): boolean => {
  const regular = regularOf(item)
  const sale = Number(item.salePriceUAH) || 0

  if (!regular || !sale || sale >= regular) return false

  const start = item.saleStartsAt ? new Date(item.saleStartsAt) : null
  const end = item.saleEndsAt ? new Date(item.saleEndsAt) : null

  if (start && now < start) return false
  if (end && now > end) return false

  return true
}

// Данные скидки, если она действует сейчас. Иначе null.
export const getSaleInfo = (item: SaleFields, now: Date = new Date()): SaleInfo | null => {
  if (!isSaleActive(item, now)) return null

  const oldPrice = regularOf(item)
  const newPrice = Number(item.salePriceUAH) || 0

  return {
    oldPrice,
    newPrice,
    percent: Math.round(((oldPrice - newPrice) / oldPrice) * 100),
    endsAt: item.saleEndsAt ?? null,
  }
}

// Строка «Діє до ...» или «Действует до ...». Если даты окончания нет, возвращает null.
export const formatSaleEnd = (value: string | null | undefined, locale: 'uk' | 'ru'): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const formatted = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return locale === 'ru' ? `Действует до ${formatted}` : `Діє до ${formatted}`
}