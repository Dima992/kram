import type { Product, Variant } from '@/payload-types';
import { getSaleInfo, type SaleInfo } from '@/utilities/sale';

export type Priced = { amount: number; sale: SaleInfo | null }

// Цена товара: со скидкой товара, если она идёт, иначе обычная
export const priceOfProduct = (product: Product): Priced | null => {
  const sale = getSaleInfo(product)
  if (sale) return { amount: sale.newPrice, sale }
  const amount = Number(product.priceInUAH) || 0
  return amount > 0 ? { amount, sale: null } : null
}

// Цена варианта: со своей ценой считаем по его полям, без своей берём цену товара
export const priceOfVariant = (variant: Variant, product: Product): Priced | null => {
  if (Number(variant.basePrice) > 0) {
    const sale = getSaleInfo(variant)
    const amount = sale ? sale.newPrice : Number(variant.priceInUAH) || 0
    return amount > 0 ? { amount, sale } : null
  }
  return priceOfProduct(product)
}