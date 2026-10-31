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

const fillVariantPrices: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const current = data as Record<string, any>
  const original = (originalDoc || {}) as Record<string, any>

  const basePrice: number | null | undefined = current.basePrice ?? original.basePrice
  const baseCurrency = (current.baseCurrency ?? original.baseCurrency ?? 'UAH') as Currency

  if (typeof basePrice !== 'number' || basePrice <= 0) {
    current.priceInUAH = null
    current.priceInUSD = null
    current.priceInEUR = null
    current.priceInUAHEnabled = false
    current.priceInUSDEnabled = false
    current.priceInEUREnabled = false
    return data
  }

  // Курс берём из сохранённого хранилища (его ежедневно обновляет крон), а не напрямую из НБУ
  const rates = await getStoredRates(req.payload)
  const rateOf = (currency: Currency) => (currency === 'UAH' ? 1 : rates[currency])
  const baseRate = rateOf(baseCurrency)
  if (!baseRate || !rates.USD || !rates.EUR) {
    throw new Error('Курс валют недоступен, цену варианта не сохранено')
  }

  const priceInUAH = Math.ceil(basePrice * baseRate)

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
        description: 'Необов’язково. Якщо порожньо, використовується ціна товару.',
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
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [...(defaultCollection.hooks?.beforeChange || []), fillVariantPrices],
  },
})