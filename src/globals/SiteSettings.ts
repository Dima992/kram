import { adminOnly } from '@/access/adminOnly'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import { revalidateTag } from 'next/cache'
import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Settings',
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (!Object.hasOwn(data, 'siteURL')) return data
        if (data.siteURL === originalDoc?.siteURL) return data

        const { docs: feeds } = await req.payload.find({
          collection: 'feeds',
          limit: 1,
          overrideAccess: true,
        })

        if (data.siteURL) {
          getPublicSiteURL(data.siteURL)
        } else if (feeds.length > 0) {
          throw new Error('Не можна видалити публічну URL-адресу, доки налаштовані товарні фіди.')
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        revalidateTag('global_site-settings', { expire: 0 })

        if (doc.siteURL === previousDoc?.siteURL) return doc

        const { docs: feeds } = await req.payload.find({
          collection: 'feeds',
          limit: 1000,
          pagination: false,
          overrideAccess: true,
        })

        if (feeds.length === 0) return doc

        const baseURL = getPublicSiteURL(doc.siteURL)
        for (const feed of feeds) {
          await req.payload.update({
            collection: 'feeds',
            id: feed.id,
            data: {
              feedURL: `${baseURL}/api/feed/${encodeURIComponent(feed.slug)}`,
            },
            overrideAccess: true,
          })
        }

        return doc
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Аналітика та серверні події',
          fields: [
            { name: 'ga4MeasurementId', type: 'text', label: 'GA4 Measurement ID' },
            { name: 'ga4ApiSecret', type: 'text', label: 'GA4 API Secret' },
            { name: 'fbPixelId', type: 'text', label: 'Meta Pixel ID' },
            { name: 'fbCapiToken', type: 'text', label: 'Meta Conversions API Token' },
            { name: 'tikTokPixelId', type: 'text', label: 'TikTok Pixel ID' },
            { name: 'tikTokEventsApiToken', type: 'text', label: 'TikTok Events API Token' },
            { name: 'googleTagManagerId', type: 'text', label: 'Google Tag Manager ID' },
          ],
        },
        {
          label: 'Сповіщення (Telegram)',
          fields: [
            { name: 'telegramBotToken', type: 'text', label: 'Telegram Bot Token' },
            {
              name: 'telegramChatId',
              type: 'text',
              label: 'Telegram Chat ID',
              admin: { description: 'Для кількох чатів вкажіть ID через кому.' },
            },
          ],
        },
        {
          label: 'Оплата (LiqPay)',
          fields: [
            { name: 'liqpayPublicKey', type: 'text', label: 'LiqPay Public Key' },
            { name: 'liqpayPrivateKey', type: 'text', label: 'LiqPay Private Key' },
          ],
        },
        {
          label: 'Доставка',
          fields: [
            { name: 'novaPoshtaApiKey', type: 'text', label: 'Нова Пошта API Key' },
            {
              name: 'ukrposhtaApiToken',
              type: 'text',
              label: 'Укрпошта: токен API (eCom)',
              admin: {
                description:
                  'Вставте лише значення токена, без слова Bearer. Використовується для списку відділень Укрпошти.',
              },
            },
          ],
        },
        {
          label: 'Оплата (Stripe)',
          fields: [
            { name: 'stripeSecretKey', type: 'text', label: 'Stripe Secret Key' },
            { name: 'stripePublishableKey', type: 'text', label: 'Stripe Publishable Key' },
            { name: 'stripeWebhookSecret', type: 'text', label: 'Stripe Webhook Secret' },
          ],
        },
        {
          label: 'Курси валют',
          fields: [
            {
              name: 'usdRate',
              type: 'number',
              label: 'Курс USD (НБУ), грн',
              admin: { readOnly: true, description: 'Оновлюється автоматично раз на день.' },
            },
            {
              name: 'eurRate',
              type: 'number',
              label: 'Курс EUR (НБУ), грн',
              admin: { readOnly: true, description: 'Оновлюється автоматично раз на день.' },
            },
            {
              name: 'ratesUpdatedAt',
              type: 'text',
              label: 'Курс оновлено',
              admin: { readOnly: true },
            },
          ],
        },
        {
          label: 'Логотип',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Логотип сайту',
              admin: {
                description:
                  'Необов’язково. Краще 400–600 пікселів завширшки, PNG або WebP. Якщо поле порожнє, показується стандартний логотип.',
              },
            },
          ],
        },
        {
          label: 'Інше',
          fields: [
            {
              name: 'siteURL',
              type: 'text',
              label: 'Публічна URL-адреса сайту',
              admin: {
                description:
                  'Основна адреса магазину (наприклад, https://example.com). Використовується для посилань товарів і фідів.',
              },
            },
            { name: 'siteName', type: 'text', label: 'Назва сайту' },
            { name: 'companyName', type: 'text', label: 'Назва компанії' },
            { name: 'previewSecret', type: 'text', label: 'Preview Secret' },
          ],
        },
        {
          label: 'API інтеграції',
          fields: [
            {
              name: 'apiKeys',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/components/BeforeDashboard/ApiKeyManager#ApiKeyManager',
                },
              },
            },
          ],
        },
      ],
    },
  ],
}