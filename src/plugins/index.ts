import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
} from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { Plugin } from 'payload'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import type { Payload } from 'payload'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { Orders } from '@/collections/Orders'
import { ProductsCollection } from '@/collections/Products'
import { VariantsCollection } from '@/collections/Variants'
import { Page, Product } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

const SITE_NAME = 'Крамниця'
const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

const getSiteStripeAdapter = async (payload: Payload) => {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    overrideAccess: true,
  })

  if (!settings.stripeSecretKey) {
    return undefined
  }

  return stripeAdapter({
    secretKey: settings.stripeSecretKey,
    publishableKey: settings.stripePublishableKey || '',
    webhookSecret: settings.stripeWebhookSecret || '',
  })
}

// Достаёт обычный текст из текста товара (он хранится как набор блоков)
const extractText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: unknown; children?: unknown[] }
  const own = typeof n.text === 'string' ? n.text : ''
  const inner = Array.isArray(n.children) ? n.children.map(extractText).join(' ') : ''
  return `${own} ${inner}`
}

// Убирает лишние пробелы и обрезает по последнему целому слову
const cleanText = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  if (!doc?.title) return SITE_NAME
  const full = `${doc.title} | ${SITE_NAME}`
  return full.length <= TITLE_MAX ? full : cleanText(doc.title, TITLE_MAX)
}

const generateDescription: GenerateDescription<Product | Page> = ({ doc }) => {
  const description = (doc as Product).description
  return cleanText(extractText(description?.root), DESCRIPTION_MAX)
}

const generateImage: GenerateImage<Product | Page> = ({ doc }) => {
  const gallery = (doc as Product).gallery ?? []
  const first = gallery.find((item) => item.mediaType !== 'youtube' && item.image)
  const image = first?.image
  if (!image) return undefined
  return typeof image === 'object' ? image.id : image
}

const generateURL: GenerateURL<Product | Page> = async ({ doc, req }) => {
  const siteSettings = await req.payload.findGlobal({
    slug: 'site-settings',
    overrideAccess: true,
  })
  const url = siteSettings.siteURL?.replace(/\/+$/, '') || getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  seoPlugin({
    generateTitle,
    generateDescription,
    generateImage,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      access: {
        delete: isAdmin,
        read: isAdmin,
        update: isAdmin,
      },
      admin: {
        group: 'Content',
      },
    },
    formOverrides: {
      access: {
        delete: isAdmin,
        read: isAdmin,
        update: isAdmin,
        create: isAdmin,
      },
      admin: {
        group: 'Content',
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  ecommercePlugin({
    currencies: {
      defaultCurrency: 'UAH',
      supportedCurrencies: [
        { code: 'UAH', decimals: 0, label: 'Гривня', symbol: '₴' },
        { code: 'USD', decimals: 0, label: 'US Dollar', symbol: '$' },
        { code: 'EUR', decimals: 0, label: 'Euro', symbol: '€' },
      ],
    },
    access: {
      adminOnlyFieldAccess,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
      isAdmin,
      isDocumentOwner,
    },
    customers: {
      slug: 'users',
    },
    orders: {
      ordersCollectionOverride: ({ defaultCollection }) => {
        const customFields = Orders.fields.filter((field) => 'name' in field)
        const customFieldNames = new Set(customFields.map((field) => field.name))

        return {
          ...defaultCollection,
          admin: {
            ...defaultCollection.admin,
            ...Orders.admin,
          },
          fields: [
            ...defaultCollection.fields.filter(
              (field) => !('name' in field) || !customFieldNames.has(field.name),
            ),
            ...customFields,
            {
              name: 'accessToken',
              type: 'text',
              unique: true,
              index: true,
              admin: {
                position: 'sidebar',
                readOnly: true,
              },
              hooks: {
                beforeValidate: [
                  ({ value, operation }) => {
                    if (operation === 'create' || !value) {
                      return crypto.randomUUID()
                    }
                    return value
                  },
                ],
              },
            },
          ],
          hooks: {
            ...defaultCollection.hooks,
            ...Orders.hooks,
            afterChange: [
              ...(defaultCollection.hooks?.afterChange || []),
              ...(Orders.hooks?.afterChange || []),
            ],
          },
        }
      },
    },
    payments: {
      paymentMethods: [
        (() => {
          const adapter = stripeAdapter({
            secretKey: '',
            publishableKey: '',
            webhookSecret: '',
          })

          return {
            ...adapter,
            initiatePayment: async (args: Parameters<typeof adapter.initiatePayment>[0]) => {
              const siteAdapter = await getSiteStripeAdapter(args.req.payload)
              if (!siteAdapter) {
                args.req.payload.logger.warn('Stripe payment skipped: secret key is not configured')
                throw new Error('Stripe is not configured')
              }
              return siteAdapter.initiatePayment(args)
            },
            confirmOrder: async (args: Parameters<typeof adapter.confirmOrder>[0]) => {
              const siteAdapter = await getSiteStripeAdapter(args.req.payload)
              if (!siteAdapter) {
                args.req.payload.logger.warn('Stripe confirmation skipped: secret key is not configured')
                throw new Error('Stripe is not configured')
              }
              return siteAdapter.confirmOrder(args)
            },
            endpoints: adapter.endpoints?.map((endpoint) => ({
              ...endpoint,
              handler: async (req) => {
                const siteAdapter = await getSiteStripeAdapter(req.payload)
                if (!siteAdapter) {
                  req.payload.logger.warn('Stripe webhook skipped: secret key is not configured')
                  return Response.json({ message: 'Stripe is not configured' }, { status: 503 })
                }

                const siteEndpoint = siteAdapter.endpoints?.find(
                  ({ path }) => path === endpoint.path,
                )
                if (!siteEndpoint) {
                  throw new Error(`Stripe endpoint ${endpoint.path} is not configured`)
                }
                return siteEndpoint.handler(req)
              },
            })),
          }
        })(),
      ],
    },
    products: {
      productsCollectionOverride: ProductsCollection,
      variants: {
        variantsCollectionOverride: VariantsCollection,
      },
    },
  }),
]