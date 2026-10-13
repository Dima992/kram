import { getNBURates } from '@/lib/nbu'
import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

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

const fillVariantPrices = async ({ data, originalDoc }: { data: any; originalDoc: any }) => {
  if (!data) return data

  const basePrice: number | null | undefined = data.basePrice ?? originalDoc?.basePrice
  const baseCurrency = (data.baseCurrency ?? originalDoc?.baseCurrency ?? 'UAH') as Currency

  if (typeof basePrice !== 'number' || basePrice <= 0) {
    data.priceInUAH = null
    data.priceInUSD = null
    data.priceInEUR = null
    data.priceInUAHEnabled = false
    data.priceInUSDEnabled = false
    data.priceInEUREnabled = false
    return data
  }

  const rates = await getNBURates()
  const rateOf = (currency: Currency) => (currency === 'UAH' ? 1 : rates[currency])
  const baseRate = rateOf(baseCurrency)
  if (!baseRate || !rates.USD || !rates.EUR) {
    throw new Error('Курс НБУ недоступен, цену варианта не сохранено')
  }

  const priceInUAH = Math.ceil(basePrice * baseRate)

  data.priceInUAH = priceInUAH
  data.priceInUSD = Math.round((priceInUAH / rates.USD) * 100) / 100
  data.priceInEUR = Math.round((priceInUAH / rates.EUR) * 100) / 100
  data.priceInUAHEnabled = true
  data.priceInUSDEnabled = true
  data.priceInEUREnabled = true

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