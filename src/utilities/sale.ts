type SaleFields = {
  priceInUAH?: number | null
  salePriceUAH?: number | null
  saleStartsAt?: string | null
  saleEndsAt?: string | null
}

export type SaleInfo = {
  oldPrice: number
  newPrice: number
  percent: number
}

// Возвращает данные скидки, если она действует сейчас. Иначе null.
export const getSaleInfo = (item: SaleFields, now: Date = new Date()): SaleInfo | null => {
  const oldPrice = Number(item.priceInUAH) || 0
  const newPrice = Number(item.salePriceUAH) || 0

  // Нет новой цены, или она не меньше обычной: скидки нет
  if (!oldPrice || !newPrice || newPrice >= oldPrice) return null

  const start = item.saleStartsAt ? new Date(item.saleStartsAt) : null
  const end = item.saleEndsAt ? new Date(item.saleEndsAt) : null

  if (start && now < start) return null
  if (end && now > end) return null

  return {
    oldPrice,
    newPrice,
    percent: Math.round(((oldPrice - newPrice) / oldPrice) * 100),
  }
}