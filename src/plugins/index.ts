import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Plugin } from 'payload'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'

import { stripeAdapter } from '@payloadcms/plugin-ecommerce/payments/stripe'
import type { Payload } from 'payload'

import { Page, Product } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { ProductsCollection } from '@/collections/Products'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { Orders } from '@/collections/Orders'

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

const generateTitle: GenerateTitle<Product | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Ecommerce Template` : 'Payload Ecommerce Template'
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
        { code: 'UAH', decimals: 2, label: 'Гривня', symbol: '₴' },
        { code: 'USD', decimals: 2, label: 'US Dollar', symbol: '$' },
        { code: 'EUR', decimals: 2, label: 'Euro', symbol: '€' },
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
    },
  }),
]
