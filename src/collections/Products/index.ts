import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { getStoredRates } from '@/utilities/exchangeRates'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { transliterate } from '@/utilities/transliterate'
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
import { autoGenerateAlt } from './hooks/autoGenerateAlt'

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection?.admin,
    components: {
    },
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
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
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
              blocks: [CallToAction, Content, MediaBlock],
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
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
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
        description: 'Валюта, в якій вказується базова ціна товару',
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
        description: 'Розрахована ціна в грн за курсом НБУ',
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
        readOnly: true,
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
        readOnly: true,
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
      slugify: ({ valueToSlugify }) => transliterate(String(valueToSlugify ?? '')),
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
      autoGenerateAlt,
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