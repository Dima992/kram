import { getStoredRates } from '@/utilities/exchangeRates'
import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { CollectionBeforeChangeHook } from 'payload'

type Currency = 'UAH' | 'USD' | 'EUR'

function hidePluginPriceFields(fields: any[]): any[] {
  return fields.map((field) => {
    if (field.type === 'row' || field.type === 'group' || field.type === 'collapsible') {
      return { ...field, fields: hidePluginPriceFields(field.fields) }
    }
    if ('name' in field && typeof field.name === 'string' && field.name.startsWith('priceIn')) {
      return { ...field, admin: { ...field.admin, hidden: true } }
    }
    return field
  })
}

// Достаём id из связи (бывает либо id, либо объект с id)
const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

const fillVariantPrices: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const current = data as Record<string, any>
  const original = (originalDoc || {}) as Record<string, any>

  // Своя цена варианта. Пустая или 0 означает «берём цену товара»
  const rawPrice = 'basePrice' in current ? current.basePrice : original.basePrice
  const ownPrice = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : 0
  const ownCurrency = (current.baseCurrency ?? original.baseCurrency ?? 'UAH') as Currency

  let amount = ownPrice
  let currency: Currency = ownCurrency

  if (ownPrice === 0) {
    const productId = idOf(current.product ?? original.product)
    if (productId) {
      const product: any = await req.payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        req,
      })
      // Цена товара уже в гривнах (её считает хук товара)
      if (typeof product?.priceInUAH === 'number' && product.priceInUAH > 0) {
        amount = product.priceInUAH
        currency = 'UAH'
      }
    }
  }

  // Цены нет ни у варианта, ни у товара: строка без цены
  if (amount === 0) {
    current.basePrice = 0
    current.priceInUAH = 0
    current.priceInUSD = 0
    current.priceInEUR = 0
    current.priceInUAHEnabled = false
    current.priceInUSDEnabled = false
    current.priceInEUREnabled = false
    return data
  }

  // Курс берём из сохранённого хранилища (его ежедневно обновляет крон)
  const rates = await getStoredRates(req.payload)
  const rateOf = (c: Currency) => (c === 'UAH' ? 1 : rates[c])
  const baseRate = rateOf(currency)
  if (!baseRate || !rates.USD || !rates.EUR) {
    throw new Error('Курс валют недоступен, цену варианта не сохранено')
  }

  const priceInUAH = Math.ceil(amount * baseRate)

  current.priceInUAH = priceInUAH
  current.priceInUSD = Math.round((priceInUAH / rates.USD) * 100) / 100
  current.priceInEUR = Math.round((priceInUAH / rates.EUR) * 100) / 100
  current.priceInUAHEnabled = true
  current.priceInUSDEnabled = true
  current.priceInEUREnabled = true

  return data
}

export const VariantsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...hidePluginPriceFields(defaultCollection.fields),
    {
      name: 'basePrice',
      type: 'number',
      label: 'Ціна варіанта',
      admin: {
        position: 'sidebar',
        description: 'Необов’язково. 0 або порожньо — використовується ціна товару.',
      },
    },
    {
      name: 'baseCurrency',
      type: 'select',
      defaultValue: 'UAH',
      label: 'Валюта ціни варіанта',
      options: [
        { label: 'Гривня (UAH)', value: 'UAH' },
        { label: 'Долар (USD)', value: 'USD' },
        { label: 'Євро (EUR)', value: 'EUR' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: 'Артикул варианта',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [...(defaultCollection.hooks?.beforeChange || []), fillVariantPrices],
  },
})