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
import { revalidateTag } from 'next/cache'
import { DefaultDocumentIDType, slugField, Where } from 'payload'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { YouTube } from '@/blocks/YouTube/config'
import { getStoredRates } from '@/utilities/exchangeRates'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { transliterate } from '@/utilities/transliterate'
import { autoGenerateAlt } from './hooks/autoGenerateAlt'

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection?.admin,
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
    inventory: true,
    meta: true,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
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
              label: false,
              required: false,
            },
            {
              name: 'gallery',
              type: 'array',
              minRows: 1,
              fields: [
                                {
                  name: 'mediaType',
                  type: 'select',
                  defaultValue: 'image',
                  options: [
                    { label: 'Фото', value: 'image' },
                    { label: 'Відео YouTube', value: 'youtube' },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    condition: (_, siblingData) => siblingData?.mediaType !== 'youtube',
                  },
                },
                {
                  name: 'youtubeUrl',
                  type: 'text',
                  label: 'Посилання на відео YouTube',
                  admin: {
                    condition: (_, siblingData) => siblingData?.mediaType === 'youtube',
                  },
                },
                {
                  name: 'variantOption',
                  type: 'relationship',
                  relationTo: 'variantOptions',
                  admin: {
                    condition: (data) => {
                      return data?.enableVariants === true && data?.variantTypes?.length > 0
                    },
                  },
                  filterOptions: ({ data }) => {
                    if (data?.enableVariants && data?.variantTypes?.length) {
                      const variantTypeIDs = data.variantTypes.map((item: any) => {
                        if (typeof item === 'object' && item?.id) {
                          return item.id
                        }
                        return item
                      }) as DefaultDocumentIDType[]

                      if (variantTypeIDs.length === 0)
                        return {
                          variantType: {
                            in: [],
                          },
                        }

                      const query: Where = {
                        variantType: {
                          in: variantTypeIDs,
                        },
                      }

                      return query
                    }

                    return {
                      variantType: {
                        in: [],
                      },
                    }
                  },
                },
              ],
            },
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock, YouTube],
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            ...defaultCollection.fields.filter(
              (field) =>
                !('name' in field && field.name === 'priceInUAH') &&
                !(
                  'fields' in field &&
                  field.fields.some(
                    (nestedField) =>
                      nestedField.type === 'row' &&
                      nestedField.fields.some(
                        (priceField) =>
                          'name' in priceField && priceField.name === 'priceInUAH',
                      ),
                  )
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
          label: 'Product Details',
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
        sortOptions: 'title',
      },
      hasMany: true,
      relationTo: 'categories',
    },
    {
      name: 'baseCurrency',
      type: 'select',
      defaultValue: 'UAH',
      options: [
        { label: 'Гривня (UAH)', value: 'UAH' },
        { label: 'Долар (USD)', value: 'USD' },
        { label: 'Євро (EUR)', value: 'EUR' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Валюта, в якій вводите ціну. Якщо вводите в гривнях, залишайте UAH. Для USD та EUR магазин сам перераховує ціну в гривні.',
      },
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Ціна у вибраній базовій валюті',
      },
    },
    {
      name: 'priceInUAH',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Розрахована ціна в грн за курсом НБУ (покупцю показується ця)',
      },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      label: 'Нотатка (тільки для адмінки)',
        access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: 'sidebar',
        description: 'Для себе: нагадування, що перевірити. На сайті не показується.',
      },
    },
    {
      name: 'excludeFromFeed',
      type: 'checkbox',
      defaultValue: false,
      label: 'Виключити з усіх рекламних фідів',
      admin: {
        position: 'sidebar',
        description:
          'Виключає товар з усіх фідів. Щоб виключити його лише з одного фіда, налаштуйте це у самому фіді.',
      },
    },
    {
      name: 'brand',
      type: 'text',
      label: 'Бренд для фідів',
      admin: {
        position: 'sidebar',
        description: 'Бренд товару. Якщо поле порожнє, використовується бренд за замовчуванням у фіді.',
      },
    },
    {
      name: 'gtin',
      type: 'text',
      label: 'GTIN / штрихкод',
      admin: {
        position: 'sidebar',
        description: 'Глобальний номер товару, наприклад EAN або UPC.',
      },
    },
    {
      name: 'mpn',
      type: 'text',
      label: 'MPN / артикул виробника',
      admin: {
        position: 'sidebar',
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
      label: 'Артикул постачальника',
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
      label: 'Постачальник',
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
        }
        return doc
      },
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
      async ({ data, req }) => {
        if (!data?.basePrice) {
          data.priceInUAH = 0
          return data
        }

        const currency = data?.baseCurrency || 'UAH'
        if (currency === 'UAH') {
          data.priceInUAH = data.basePrice
          return data
        }

        const rates = await getStoredRates(req.payload)
        const rate = currency === 'USD' ? rates.USD : rates.EUR
        data.priceInUAH = Math.ceil(data.basePrice * rate)

        return data
      },
    ],
  },
})