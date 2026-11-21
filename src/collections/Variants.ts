import { adminLabel } from '@/utilities/adminLabel'
import { getStoredRates } from '@/utilities/exchangeRates'
import { calcCurrencyPrices, calcVariantPrices } from '@/utilities/prices'
import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { CollectionBeforeChangeHook } from 'payload'

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

// Считает цены варианта при каждом сохранении
const fillVariantPrices: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const current = data as Record<string, any>
  const original = (originalDoc || {}) as Record<string, any>

  // Полные данные варианта: новые значения поверх старых
  const merged = { ...original, ...current }

  // Товар нужен только если у варианта нет своей цены
  let product: any = null
  const productId = idOf(merged.product)
  if (productId && !(Number(merged.basePrice) > 0)) {
    product = await req.payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
      req,
    })
  }

  // Курс берём из сохранённого хранилища (его обновляет крон)
  const rates = await getStoredRates(req.payload)
  const prices = calcVariantPrices({ item: merged, product, rates })

  // Цены нет ни у варианта, ни у товара: строка без цены
  if (!prices) {
    current.regularPriceUAH = 0
    current.priceInUAH = 0
    current.priceInUSD = 0
    current.priceInEUR = 0
    current.priceInUAHEnabled = false
    current.priceInUSDEnabled = false
    current.priceInEUREnabled = false
    return data
  }

  const converted = calcCurrencyPrices(prices.priceInUAH, rates)
  current.regularPriceUAH = prices.regularPriceUAH
  current.priceInUAH = converted.priceInUAH
  current.priceInUSD = converted.priceInUSD
  current.priceInEUR = converted.priceInEUR
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
      label: adminLabel('Ціна варіанта', 'Цена варианта'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Необов’язково. 0 або порожньо — використовується ціна товару.',
          'Необязательно. Если указать 0 или оставить пустым, используется цена товара.',
        ),
      },
    },
    {
      name: 'baseCurrency',
      type: 'select',
      defaultValue: 'UAH',
      label: adminLabel('Валюта ціни варіанта', 'Валюта цены варианта'),
      options: [
        { label: adminLabel('Гривня (UAH)', 'Гривна (UAH)'), value: 'UAH' },
        { label: adminLabel('Долар (USD)', 'Доллар (USD)'), value: 'USD' },
        { label: adminLabel('Євро (EUR)', 'Евро (EUR)'), value: 'EUR' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'regularPriceUAH',
      type: 'number',
      label: adminLabel('Звичайна ціна (грн)', 'Обычная цена (грн)'),
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: adminLabel(
          'Розраховується автоматично.',
          'Рассчитывается автоматически.',
        ),
      },
    },
    {
      name: 'salePriceUAH',
      type: 'number',
      label: adminLabel('Ціна зі знижкою (грн)', 'Цена со скидкой (грн)'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Для варіанта зі своєю ціною. Якщо своєї ціни немає, діє знижка товару.',
          'Для варианта со своей ценой. Если своей цены нет, действует скидка товара.',
        ),
      },
    },
    {
      name: 'saleStartsAt',
      type: 'date',
      label: adminLabel('Знижка з', 'Скидка с'),
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'saleEndsAt',
      type: 'date',
      label: adminLabel('Знижка по', 'Скидка по'),
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: adminLabel('Артикул варіанта', 'Артикул варианта'),
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