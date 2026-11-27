import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Field, slugField, Where } from 'payload'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { YouTube } from '@/blocks/YouTube/config'
import { adminLabel } from '@/utilities/adminLabel'
import { getStoredRates } from '@/utilities/exchangeRates'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { calcCurrencyPrices, calcPrices, calcVariantPrices } from '@/utilities/prices'
import { transliterate } from '@/utilities/transliterate'
import { autoGenerateAlt } from './hooks/autoGenerateAlt'

const SITE_NAME = 'Крамниця'

// Курсы держим в памяти 10 минут: не читаем базу при каждом сохранении
let ratesCache: { at: number; rates: Awaited<ReturnType<typeof getStoredRates>> } | null = null
const RATES_TTL_MS = 10 * 60 * 1000

const getRatesCached = async (payload: any) => {
  if (ratesCache && Date.now() - ratesCache.at < RATES_TTL_MS) return ratesCache.rates
  const rates = await getStoredRates(payload)
  ratesCache = { at: Date.now(), rates }
  return rates
}

// Обрезает текст по последнему целому слову
const cleanText = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

// Достаёт обычный текст из описания (оно хранится как набор блоков)
const extractText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: unknown; children?: unknown[] }
  const own = typeof n.text === 'string' ? n.text : ''
  const inner = Array.isArray(n.children) ? n.children.map(extractText).join(' ') : ''
  return `${own} ${inner}`
}

// Заполняет пустые SEO-поля при сохранении товара.
// Работает для любого товара: созданного вручную, импортом или через API.
const fillEmptySeo = ({ data }: { data: any }) => {
  // Если товар сохраняют частично (без названия), не трогаем SEO
  if (!data || data.title === undefined) return data

  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const meta = { ...(data.meta ?? {}) }

  // Заголовок: «Название | Крамниця», не длиннее 60 знаков
  if (!meta.title?.trim() && title) {
    const full = `${title} | ${SITE_NAME}`
    meta.title = full.length <= 60 ? full : cleanText(title, 60)
  }

  // Описание: начало текста товара, до 155 знаков
  if (!meta.description?.trim()) {
    meta.description = cleanText(extractText(data.description?.root), 155)
  }

  // Картинка: первое фото из галереи (видео не берём)
  if (!meta.image) {
    const gallery: any[] = Array.isArray(data.gallery) ? data.gallery : []
    const first = gallery.find((item) => item && item.mediaType !== 'youtube' && item.image)
    if (first?.image) {
      meta.image = typeof first.image === 'object' ? first.image.id : first.image
    }
  }

  data.meta = meta
  return data
}

// Id варианта из строки галереи (бывает либо сам id, либо объект с id)
const variantOptionIdOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

// Сохраняет название выбранного варианта в каждую строку галереи.
// Все значения читаем ОДНИМ запросом, а не по одному на каждую строку галереи.
const fillVariantLabels = async ({ data, req }: { data: any; req: any }) => {
  if (!data || !Array.isArray(data.gallery)) return data

  const ids = [
    ...new Set(
      (data.gallery as any[])
        .map((row) => variantOptionIdOf(row?.variantOption))
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const labels = new Map<string, string>()
  if (ids.length > 0) {
    try {
      const { docs } = await req.payload.find({
        collection: 'variantOptions',
        where: { id: { in: ids } },
        limit: ids.length,
        pagination: false,
        depth: 0,
        req,
      })
      for (const option of docs as any[]) {
        labels.set(String(option.id), option.label ?? '')
      }
    } catch {
      // Значения не прочитались: подписи будут пустыми, сохранение не ломаем
    }
  }

  for (const row of data.gallery as any[]) {
    const id = variantOptionIdOf(row?.variantOption)
    row.variantLabel = id ? labels.get(id) ?? '' : ''
  }

  return data
}

// Цены в гривнах при каждом сохранении: обычная и та, что действует сейчас.
// Расчёт делает общий файл prices.ts (тот же, что использует крон).
const applyPrices = async ({ data, req }: { data: any; req: any }) => {
  // Если базовую цену не передали (например, при создании вариантов), не пересчитываем
  if (!data || data.basePrice === undefined) return data

  // Курс нужен только для USD и EUR, для гривен его не читаем
  const currency = data.baseCurrency || 'UAH'
  const rates = currency === 'UAH' ? { USD: 0, EUR: 0 } : await getRatesCached(req.payload)

  const prices = calcPrices(data, rates)
  data.regularPriceUAH = prices.regularPriceUAH
  data.priceInUAH = prices.priceInUAH

  return data
}

// Поля, от которых зависят цены вариантов
const PRICE_FIELDS = ['basePrice', 'baseCurrency', 'salePriceUAH', 'saleStartsAt', 'saleEndsAt']

// Меняли ли что-то из цен
const pricesChanged = (doc: any, previousDoc?: any) => {
  if (!previousDoc) return true
  return PRICE_FIELDS.some(
    (field) => JSON.stringify(doc[field] ?? null) !== JSON.stringify(previousDoc[field] ?? null),
  )
}

// После сохранения товара пересчитываем цены вариантов без своей цены.
// Пишем только те варианты, у которых цена реально изменилась, и не пересчитываем их в хуке.
const syncVariantPrices = async ({
  doc,
  previousDoc,
  req,
}: {
  doc: any
  previousDoc?: any
  req: any
}) => {
  if (!doc?.id) return doc

  // Цены не менялись: варианты не трогаем
  if (!pricesChanged(doc, previousDoc)) return doc

  try {
    const rates = await getRatesCached(req.payload)

    const { docs: variants } = await req.payload.find({
      collection: 'variants',
      where: { product: { equals: doc.id } },
      pagination: false,
      depth: 0,
      draft: true,
      req,
    })

    for (const variant of variants as any[]) {
      // Варианты со своей ценой не трогаем
      if (Number(variant.basePrice) > 0) continue

      const prices = calcVariantPrices({ item: variant, product: doc, rates })
      if (!prices) continue

      const converted = calcCurrencyPrices(prices.priceInUAH, rates)

      // Если цены уже правильные, запись не нужна
      const unchanged =
        Number(variant.regularPriceUAH) === prices.regularPriceUAH &&
        Number(variant.priceInUAH) === converted.priceInUAH &&
        Number(variant.priceInUSD) === converted.priceInUSD &&
        Number(variant.priceInEUR) === converted.priceInEUR
      if (unchanged) continue

      await req.payload.update({
        collection: 'variants',
        id: variant.id,
        data: {
          regularPriceUAH: prices.regularPriceUAH,
          priceInUAH: converted.priceInUAH,
          priceInUSD: converted.priceInUSD,
          priceInEUR: converted.priceInEUR,
          priceInUAHEnabled: true,
          priceInUSDEnabled: true,
          priceInEUREnabled: true,
        },
        // Цены уже посчитаны выше: хук варианта их не пересчитывает
        context: { disableRevalidate: true, skipVariantPrice: true },
        req,
      })
    }
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Не удалось пересчитать варианты товара' })
  }

  return doc
}

// Процент скидки: от обычной цены и цены со скидкой.
// Если поле цены со скидкой не пришло (например, крон обновляет только цены), не трогаем процент.
const calculateDiscount = ({ data }: { data: any }) => {
  if (!data || !('salePriceUAH' in data)) return data

  const regular = Number(data.regularPriceUAH) || 0
  const sale = Number(data.salePriceUAH) || 0

  if (!regular || !sale || sale >= regular) {
    data.discountPercent = null
    return data
  }

  data.discountPercent = Math.round(((regular - sale) / regular) * 100)
  return data
}

// Прячем из админки поля цен в USD и EUR (покупатель видит только гривны).
// Поля не удаляем: плагин магазина может их использовать.
const hideCurrencyFields = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if ('name' in field && field.name.startsWith('priceIn') && field.name !== 'priceInUAH') {
      return { ...field, admin: { ...field.admin, hidden: true } } as Field
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      return { ...field, fields: hideCurrencyFields(field.fields) } as Field
    }
    return field
  })

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  // Черновики включены, в истории храним 2 версии
  versions: {
    drafts: true,
    maxPerDoc: 2,
  },
  labels: {
    singular: adminLabel('Товар', 'Товар'),
    plural: adminLabel('Товари', 'Товары'),
  },
  admin: {
    ...defaultCollection?.admin,
    group: adminLabel('Контент', 'Контент'),
    defaultColumns: ['title', 'basePrice', 'baseCurrency', 'priceInUAH', '_status'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    ...defaultCollection?.defaultPopulate,
    title: true,
    slug: true,
    variantOptions: true,
    variants: true,
    enableVariants: true,
    gallery: true,
    brand: true,
    gtin: true,
    mpn: true,
    baseCurrency: true,
    basePrice: true,
    priceInUAH: true,
    regularPriceUAH: true,
    inventory: true,
    meta: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: adminLabel('Назва товару', 'Название товара'),
      required: true,
      localized: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'description',
              type: 'richText',
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: adminLabel('Опис товару', 'Описание товара'),
              required: false,
            },
            {
              name: 'gallery',
              type: 'array',
              label: adminLabel('Галерея', 'Галерея'),
              minRows: 1,
              admin: {
                components: {
                  RowLabel: '@/components/admin/GalleryRowLabel#GalleryRowLabel',
                },
              },
              fields: [
                {
                  name: 'mediaType',
                  type: 'select',
                  label: adminLabel('Тип медіа', 'Тип медиа'),
                  defaultValue: 'image',
                  options: [
                    { label: adminLabel('Фото', 'Фото'), value: 'image' },
                    { label: adminLabel('Відео YouTube', 'Видео YouTube'), value: 'youtube' },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  label: adminLabel('Зображення', 'Изображение'),
                  relationTo: 'media',
                  admin: {
                    condition: (_, siblingData) => siblingData?.mediaType !== 'youtube',
                  },
                },
                {
                  name: 'youtubeUrl',
                  type: 'text',
                  label: adminLabel('Посилання на відео YouTube', 'Ссылка на видео YouTube'),
                  admin: {
                    condition: (_, siblingData) => siblingData?.mediaType === 'youtube',
                  },
                },
                {
                  name: 'variantOption',
                  type: 'relationship',
                  label: adminLabel('Варіант товару', 'Вариант товара'),
                  relationTo: 'variantOptions',
                  admin: {
                    condition: (data) => {
                      return data?.enableVariants === true && data?.variantTypes?.length > 0
                    },
                  },
                  filterOptions: ({ data }) => {
                    // Фото привязываем только к характеристикам, где включено «Фото потрібні»
                    const settings = (data?.variantSettings ?? {}) as Record<
                      string,
                      { photos?: boolean }
                    >
                    const selected = (data?.attributes ?? {}) as Record<string, string[]>

                    // Коды значений (v-<id значения>), выбранных у товара в таких характеристиках
                    const codes: string[] = []
                    for (const charId of Object.keys(settings)) {
                      if (!settings[charId]?.photos) continue
                      for (const valueId of selected[charId] ?? []) {
                        codes.push(`v-${valueId}`)
                      }
                    }

                    if (codes.length === 0) {
                      return { value: { in: [] } } as Where
                    }

                    return { value: { in: codes } } as Where
                  },
                },
                {
                  // Название варианта, заполняется автоматически при сохранении (для подписей в админке)
                  name: 'variantLabel',
                  type: 'text',
                  admin: {
                    hidden: true,
                    readOnly: true,
                  },
                },
              ],
            },
            {
              name: 'layout',
              localized: true,
              type: 'blocks',
              label: adminLabel('Блоки контенту', 'Блоки контента'),
              blocks: [CallToAction, Content, MediaBlock, YouTube],
            },
          ],
          label: adminLabel('Контент', 'Контент'),
        },
        {
          fields: [
            ...hideCurrencyFields(
              defaultCollection.fields.filter(
                (field) =>
                  !('name' in field && field.name === 'priceInUAH') &&
                  !(
                    'fields' in field &&
                    field.fields.some(
                      (nestedField) =>
                        nestedField.type === 'row' &&
                        nestedField.fields.some(
                          (priceField) => 'name' in priceField && priceField.name === 'priceInUAH',
                        ),
                    )
                  ),
              ),
            ),
            {
              name: 'relatedProducts',
              type: 'relationship',
              filterOptions: ({ id }) => {
                if (id) {
                  return {
                    id: {
                      not_in: [id],
                    },
                  }
                }

                return {
                  id: {
                    exists: true,
                  },
                }
              },
              hasMany: true,
              relationTo: 'products',
            },
          ],
          label: adminLabel('Деталі товару', 'Детали товара'),
        },
        {
          // Отдельная вкладка для характеристик (галочки по основной категории)
          fields: [
            {
              name: 'attributes',
              type: 'json',
              label: adminLabel('Характеристики', 'Характеристики'),
              admin: {
                components: {
                  Field: '@/components/admin/CharacteristicsField#CharacteristicsField',
                },
              },
            },
            {
              name: 'variantSettings',
              type: 'json',
              admin: {
                hidden: true,
              },
            },
          ],
          label: adminLabel('Характеристики', 'Характеристики'),
        },
        {
          // Вкладка Google: категория для фида и поля, которых нет в характеристиках
          label: 'Google',
          fields: [
            {
              name: 'googleCategory',
              type: 'relationship',
              relationTo: 'google-categories',
              label: adminLabel('Категорія Google', 'Категория Google'),
              admin: {
                description: adminLabel(
                  'Виберіть категорію зі списку. Від неї залежать поля, які Google очікує для цього товару.',
                  'Выберите категорию из списка. От неё зависят поля, которые Google ожидает для этого товара.',
                ),
              },
            },
            {
              name: 'googleAgeGroup',
              type: 'select',
              defaultValue: 'adult',
              label: adminLabel('Вікова група (age_group)', 'Возрастная группа (age_group)'),
              options: [
                { label: adminLabel('Дорослі (adult)', 'Взрослые (adult)'), value: 'adult' },
                { label: adminLabel('Діти (kids)', 'Дети (kids)'), value: 'kids' },
              ],
              admin: {
                description: adminLabel(
                  'Для жіночого одягу зазвичай «Дорослі».',
                  'Для женской одежды обычно «Взрослые».',
                ),
              },
            },
            {
              name: 'googleCondition',
              type: 'select',
              defaultValue: 'new',
              label: adminLabel('Стан (condition)', 'Состояние (condition)'),
              options: [
                { label: adminLabel('Нове (new)', 'Новое (new)'), value: 'new' },
                { label: adminLabel('Б/в (used)', 'Б/у (used)'), value: 'used' },
                {
                  label: adminLabel('Відновлене (refurbished)', 'Восстановленное (refurbished)'),
                  value: 'refurbished',
                },
              ],
            },
            {
              name: 'googleGender',
              type: 'select',
              label: adminLabel('Стать (gender)', 'Пол (gender)'),
              options: [
                { label: adminLabel('Жіноча (female)', 'Женский (female)'), value: 'female' },
                { label: adminLabel('Чоловіча (male)', 'Мужской (male)'), value: 'male' },
                { label: adminLabel('Унісекс (unisex)', 'Унисекс (unisex)'), value: 'unisex' },
              ],
              admin: {
                description: adminLabel(
                  'Для жіночого одягу зазвичай «Жіноча». Для постільного та теплиць залиште порожнім.',
                  'Для женской одежды обычно «Женский». Для постельного белья и теплиц оставьте пустым.',
                ),
              },
            },
            {
              name: 'googleStatus',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/components/admin/GoogleField#GoogleField',
                },
              },
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            // Поля не обязательные: если пусто, заполнятся сами при сохранении
            MetaTitleField({
              hasGenerateFn: true,
              overrides: { localized: true },
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({
              overrides: { localized: true },
            }),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/CategoryTreeField#CategoryTreeField',
        },
      },
      hasMany: true,
      relationTo: 'categories',
    },
    {
      name: 'sizeChart',
      type: 'relationship',
      relationTo: 'size-charts',
      label: adminLabel('Таблиця розмірів', 'Таблица размеров'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Оберіть таблицю для типу товару. Якщо порожньо, на сайті таблиці не буде.',
          'Выберите таблицу для типа товара. Если оставить пустым, таблица не будет показана на сайте.',
        ),
      },
    },
    {
      name: 'baseCurrency',
      type: 'select',
      label: adminLabel('Валюта ціни', 'Валюта цены'),
      defaultValue: 'UAH',
      options: [
        { label: adminLabel('Гривня (UAH)', 'Гривна (UAH)'), value: 'UAH' },
        { label: adminLabel('Долар (USD)', 'Доллар (USD)'), value: 'USD' },
        { label: adminLabel('Євро (EUR)', 'Евро (EUR)'), value: 'EUR' },
      ],
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Валюта, у якій вводите ціну. Якщо вводите в гривнях, залишайте UAH. Для USD та EUR магазин сам перераховує ціну в гривні.',
          'Валюта, в которой вводится цена. Для гривен оставьте UAH. Цены в USD и EUR магазин автоматически пересчитает в гривны.',
        ),
      },
    },
    {
      name: 'basePrice',
      type: 'number',
      label: adminLabel('Базова ціна', 'Базовая цена'),
      required: true,
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Ціна у вибраній базовій валюті',
          'Цена в выбранной базовой валюте',
        ),
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
          'Ціна без знижки в грн за курсом НБУ',
          'Цена без скидки в грн по курсу НБУ',
        ),
      },
    },
    {
      name: 'priceInUAH',
      type: 'number',
      label: adminLabel('Ціна зараз (грн)', 'Цена сейчас (грн)'),
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: adminLabel(
          'Ціна, яку бачить покупець і яка йде в оплату. Оновлюється при збереженні.',
          'Цена, которую видит покупатель и которая идёт в оплату. Обновляется при сохранении.',
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
          'Нова ціна в гривнях. Якщо порожньо, знижки немає.',
          'Новая цена в гривнах. Если пусто, скидки нет.',
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
      name: 'discountPercent',
      type: 'number',
      label: adminLabel('Знижка, %', 'Скидка, %'),
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: adminLabel('Розраховується автоматично.', 'Рассчитывается автоматически.'),
      },
    },
    {
      name: 'stockStatus',
      type: 'select',
      defaultValue: 'inStock',
      label: adminLabel('Статус наявності', 'Статус наличия'),
      options: [
        { label: adminLabel('В наявності', 'В наличии'), value: 'inStock' },
        { label: adminLabel('Під замовлення', 'Под заказ'), value: 'backorder' },
        { label: adminLabel('Немає в наявності', 'Нет в наличии'), value: 'outOfStock' },
      ],
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Поки що тільки для адмінки: на сайті статус покажемо на наступному кроці.',
          'Пока только для админки: статус на сайте появится позже.',
        ),
      },
    },
    {
      name: 'backorderDays',
      type: 'number',
      label: adminLabel('Строк доставки під замовлення (днів)', 'Срок доставки под заказ (дней)'),
      admin: {
        position: 'sidebar',
        condition: (data) => data?.stockStatus === 'backorder',
        description: adminLabel('Скільки днів чекати товар.', 'Сколько дней ждать товар.'),
      },
    },
    {
      name: 'decrementOnOrder',
      type: 'checkbox',
      defaultValue: false,
      label: adminLabel('Віднімати кількість при замовленні', 'Уменьшать остаток после заказа'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Поки що тільки позначка. Логіку додамо пізніше.',
          'Пока это только отметка. Логика будет добавлена позже.',
        ),
      },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      label: adminLabel('Нотатка (тільки для адмінки)', 'Заметка (только для админки)'),
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Для себе: нагадування, що перевірити. На сайті не показується.',
          'Для себя: напоминание, что проверить. На сайте не отображается.',
        ),
      },
    },
    {
      name: 'excludeFromFeed',
      type: 'checkbox',
      defaultValue: false,
      label: adminLabel('Виключити з усіх рекламних фідів', 'Исключить из всех рекламных фидов'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Виключає товар з усіх фідів. Щоб виключити його лише з одного фіда, налаштуйте це у самому фіді.',
          'Исключает товар из всех фидов. Чтобы исключить его только из одного фида, настройте это в самом фиде.',
        ),
      },
    },
    {
      name: 'hideFromShop',
      type: 'checkbox',
      defaultValue: false,
      label: adminLabel('Приховати від покупця', 'Скрыть от покупателя'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Товар залишається в адмінці, але не показується на сайті.',
          'Товар остаётся в админке, но не показывается на сайте.',
        ),
      },
    },
    {
      name: 'brand',
      type: 'text',
      label: adminLabel('Бренд для фідів', 'Бренд для фидов'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Бренд товару. Якщо поле порожнє, використовується бренд за замовчуванням у фіді.',
          'Бренд товара. Если поле пустое, используется бренд по умолчанию в фиде.',
        ),
      },
    },
    {
      name: 'gtin',
      type: 'text',
      label: 'GTIN / штрихкод',
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Глобальний номер товару, наприклад EAN або UPC.',
          'Глобальный номер товара, например EAN или UPC.',
        ),
      },
    },
    {
      name: 'mpn',
      type: 'text',
      label: adminLabel('MPN / артикул виробника', 'MPN / артикул производителя'),
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: 'Артикул (SKU)',
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Базовий артикул товару, наприклад SH-001. Від нього утворюються артикули варіантів (SH-001-1, SH-001-2).',
          'Базовый артикул товара, например SH-001. От него формируются артикулы вариантов (SH-001-1, SH-001-2).',
        ),
      },
    },
    {
      name: 'supplierSourceKey',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'supplierRef',
      type: 'relationship',
      relationTo: 'import-sources',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'supplierSKU',
      type: 'text',
      label: adminLabel('Артикул постачальника', 'Артикул поставщика'),
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'supplierProductKey',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'supplierName',
      type: 'text',
      label: adminLabel('Постачальник', 'Поставщик'),
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'supplierImageURL',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    slugField({
      slugify: async ({ valueToSlugify, data, req }) => {
        const base = transliterate(String(valueToSlugify ?? ''))
        if (!base) return ''

        let candidate = base
        for (let n = 2; ; n++) {
          const found = await req.payload.find({
            collection: 'products',
            where: {
              and: [
                { slug: { equals: candidate } },
                ...(data?.id ? [{ id: { not_equals: data.id } }] : []),
              ],
            },
            limit: 1,
            depth: 0,
            draft: true,
            pagination: false,
            req,
          })

          if (found.docs.length === 0) return candidate
          candidate = `${base}-${n}`
        }
      },
    }),
  ],
  hooks: {
    ...defaultCollection?.hooks,
    afterChange: [
      ...(defaultCollection?.hooks?.afterChange || []),

      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate && doc._status === 'published') {
          revalidateTag('products', { expire: 0 })
          revalidatePath('/shop', 'layout')
        }
        return doc
      },

      // Варианты без своей цены: пересчитываем, только если поменялась цена
      ({ doc, previousDoc, req }) => syncVariantPrices({ doc, previousDoc, req }),

      // Альты фото: после сохранения, на двух языках
      autoGenerateAlt,
    ],
    afterDelete: [
      ...(defaultCollection?.hooks?.afterDelete || []),
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) revalidateTag('products', { expire: 0 })
        return doc
      },
    ],
    beforeChange: [
      ...(defaultCollection?.hooks?.beforeChange || []),

      // SEO: заполняем пустые поля (работает и для импорта, и для API)
      ({ data }) => fillEmptySeo({ data }),

      // Название варианта в каждую строку галереи (для подписей в админке)
      ({ data, req }) => fillVariantLabels({ data, req }),

      // Обычная цена и цена, которая действует сейчас
      ({ data, req }) => applyPrices({ data, req }),

      // Процент скидки (после расчёта цен)
      ({ data }) => calculateDiscount({ data }),
    ],
  },
})