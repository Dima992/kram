import type { Order, OrderStatus, Product } from '@/payload-types'

const orderStatuses: OrderStatus[] = [
  'new',
  'in_processing',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'refunded',
]
const deliveryCarriers = ['nova_poshta', 'ukrposhta'] as const
const paymentMethods = ['liqpay', 'iban', 'cod'] as const
const orderTypes = ['full', 'quick'] as const
const deliveryDetailFields = ['city', 'warehouse', 'postcode', 'address'] as const
const productCurrencies = ['UAH', 'USD', 'EUR'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateOrderWrite(value: unknown): Partial<Order> | null {
  if (!isRecord(value)) return null
  const allowedFields = new Set([
    'status',
    'orderType',
    'customerName',
    'customerEmail',
    'phone',
    'deliveryCarrier',
    'deliveryDetails',
    'paymentMethod',
    'totalAmount',
    'amount',
    'currency',
    'items',
  ])
  if (Object.keys(value).some((key) => !allowedFields.has(key))) return null

  const data: Partial<Order> = {}
  if ('status' in value) {
    if (typeof value.status !== 'string' || !orderStatuses.includes(value.status as OrderStatus)) {
      return null
    }
    data.status = value.status as OrderStatus
  }
  if ('orderType' in value) {
    if (
      typeof value.orderType !== 'string' ||
      !orderTypes.includes(value.orderType as 'full' | 'quick')
    ) {
      return null
    }
    data.orderType = value.orderType as 'full' | 'quick'
  }
  for (const field of ['customerName', 'customerEmail', 'phone'] as const) {
    if (field in value) {
      if (typeof value[field] !== 'string' || value[field].length > 500) return null
      data[field] = value[field]
    }
  }
  if ('deliveryCarrier' in value) {
    if (
      value.deliveryCarrier !== null &&
      (typeof value.deliveryCarrier !== 'string' ||
        !deliveryCarriers.includes(value.deliveryCarrier as (typeof deliveryCarriers)[number]))
    ) {
      return null
    }
    data.deliveryCarrier = value.deliveryCarrier as Order['deliveryCarrier']
  }
  if ('paymentMethod' in value) {
    if (
      value.paymentMethod !== null &&
      (typeof value.paymentMethod !== 'string' ||
        !paymentMethods.includes(value.paymentMethod as (typeof paymentMethods)[number]))
    ) {
      return null
    }
    data.paymentMethod = value.paymentMethod as Order['paymentMethod']
  }
  for (const field of ['totalAmount', 'amount'] as const) {
    if (field in value) {
      if (
        typeof value[field] !== 'number' ||
        !Number.isFinite(value[field]) ||
        value[field] < 0
      ) {
        return null
      }
      data[field] = value[field]
    }
  }
  if ('currency' in value) {
    if (value.currency !== 'UAH' && value.currency !== 'USD' && value.currency !== 'EUR') {
      return null
    }
    data.currency = value.currency
  }
  if ('deliveryDetails' in value) {
    if (!isRecord(value.deliveryDetails)) return null
    if (
      Object.keys(value.deliveryDetails).some(
        (key) => !deliveryDetailFields.includes(key as (typeof deliveryDetailFields)[number]),
      )
    ) {
      return null
    }
    const details: NonNullable<Order['deliveryDetails']> = {}
    for (const field of deliveryDetailFields) {
      if (field in value.deliveryDetails) {
        const fieldValue = value.deliveryDetails[field]
        if (typeof fieldValue !== 'string' || fieldValue.length > 500) return null
        details[field] = fieldValue
      }
    }
    data.deliveryDetails = details
  }
  if ('items' in value) {
    if (!Array.isArray(value.items) || value.items.length > 100) return null
    const items: NonNullable<Order['items']> = []
    for (const item of value.items) {
      if (
        !isRecord(item) ||
        Object.keys(item).some((key) => key !== 'product' && key !== 'quantity') ||
        typeof item.product !== 'string' ||
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return null
      }
      items.push({ product: item.product, quantity: item.quantity })
    }
    data.items = items
  }

  return data
}

export type ProductWriteData = Partial<
  Pick<
    Product,
    | 'title'
    | 'slug'
    | 'basePrice'
    | 'baseCurrency'
    | 'inventory'
    | 'gtin'
    | 'mpn'
    | 'brand'
    | '_status'
  >
>

export function validateProductWrite(value: unknown): ProductWriteData | null {
  if (!isRecord(value)) return null
  const allowedFields = new Set([
    'title',
    'slug',
    'basePrice',
    'baseCurrency',
    'inventory',
    'gtin',
    'mpn',
    'brand',
    '_status',
  ])
  if (Object.keys(value).some((key) => !allowedFields.has(key))) return null

  const data: ProductWriteData = {}
  for (const field of ['title', 'slug'] as const) {
    if (field in value) {
      if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 300) {
        return null
      }
      data[field] = value[field].trim()
    }
  }
  if ('basePrice' in value) {
    if (
      typeof value.basePrice !== 'number' ||
      !Number.isFinite(value.basePrice) ||
      value.basePrice < 0
    ) {
      return null
    }
    data.basePrice = value.basePrice
  }
  if ('baseCurrency' in value) {
    if (
      typeof value.baseCurrency !== 'string' ||
      !productCurrencies.includes(value.baseCurrency as (typeof productCurrencies)[number])
    ) {
      return null
    }
    data.baseCurrency = value.baseCurrency as Product['baseCurrency']
  }
  if ('inventory' in value) {
    if (
      typeof value.inventory !== 'number' ||
      !Number.isInteger(value.inventory) ||
      value.inventory < 0
    ) {
      return null
    }
    data.inventory = value.inventory
  }
  for (const field of ['gtin', 'mpn', 'brand'] as const) {
    if (field in value) {
      if (
        value[field] !== null &&
        (typeof value[field] !== 'string' || value[field].length > 300)
      ) {
        return null
      }
      data[field] = value[field]
    }
  }
  if ('_status' in value) {
    if (value._status !== 'draft' && value._status !== 'published') return null
    data._status = value._status
  }

  return data
}
