import { adminOnly } from '@/access/adminOnly'
import { adminLabel } from '@/utilities/adminLabel'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import { revalidateTag } from 'next/cache'
import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: adminLabel('Налаштування сайту', 'Настройки сайта'),
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: adminLabel('Налаштування', 'Настройки'),
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
          label: adminLabel('Аналітика та серверні події', 'Аналитика и серверные события'),
          fields: [
            {
              name: 'ga4MeasurementId',
              type: 'text',
              label: adminLabel('Ідентифікатор GA4', 'Идентификатор GA4'),
            },
            {
              name: 'ga4ApiSecret',
              type: 'text',
              label: adminLabel('Секретний ключ API GA4', 'Секретный ключ API GA4'),
            },
            {
              name: 'fbPixelId',
              type: 'text',
              label: adminLabel('Ідентифікатор пікселя Meta', 'Идентификатор пикселя Meta'),
            },
            {
              name: 'fbCapiToken',
              type: 'text',
              label: adminLabel('Токен API конверсій Meta', 'Токен API конверсий Meta'),
            },
            {
              name: 'tikTokPixelId',
              type: 'text',
              label: adminLabel('Ідентифікатор пікселя TikTok', 'Идентификатор пикселя TikTok'),
            },
            {
              name: 'tikTokEventsApiToken',
              type: 'text',
              label: adminLabel('Токен API подій TikTok', 'Токен API событий TikTok'),
            },
            {
              name: 'googleTagManagerId',
              type: 'text',
              label: adminLabel(
                'Ідентифікатор Google Tag Manager',
                'Идентификатор Google Tag Manager',
              ),
            },
          ],
        },
        {
          label: adminLabel('Сповіщення (Telegram)', 'Уведомления (Telegram)'),
          fields: [
            {
              name: 'telegramBotToken',
              type: 'text',
              label: adminLabel('Токен бота Telegram', 'Токен бота Telegram'),
            },
            {
              name: 'telegramChatId',
              type: 'text',
              label: adminLabel('ID чату Telegram', 'ID чата Telegram'),
              admin: {
                description: adminLabel(
                  'Для кількох чатів вкажіть ID через кому.',
                  'Для нескольких чатов укажите ID через запятую.',
                ),
              },
            },
          ],
        },
        {
          label: adminLabel('Оплата (LiqPay)', 'Оплата (LiqPay)'),
          fields: [
            {
              name: 'liqpayPublicKey',
              type: 'text',
              label: adminLabel('Публічний ключ LiqPay', 'Публичный ключ LiqPay'),
            },
            {
              name: 'liqpayPrivateKey',
              type: 'text',
              label: adminLabel('Приватний ключ LiqPay', 'Приватный ключ LiqPay'),
            },
          ],
        },
        {
          label: adminLabel('Доставка', 'Доставка'),
          fields: [
            {
              name: 'novaPoshtaApiKey',
              type: 'text',
              label: adminLabel('Ключ API Нової пошти', 'Ключ API Новой почты'),
            },
            {
              name: 'ukrposhtaApiToken',
              type: 'text',
              label: adminLabel('Укрпошта: токен API (eCom)', 'Укрпочта: токен API (eCom)'),
              admin: {
                description: adminLabel(
                  'Вставте лише значення токена, без слова Bearer. Використовується для списку відділень Укрпошти.',
                  'Вставьте только значение токена, без слова Bearer. Используется для списка отделений Укрпочты.',
                ),
              },
            },
          ],
        },
        {
          label: adminLabel('Оплата (Stripe)', 'Оплата (Stripe)'),
          fields: [
            {
              name: 'stripeSecretKey',
              type: 'text',
              label: adminLabel('Секретний ключ Stripe', 'Секретный ключ Stripe'),
            },
            {
              name: 'stripePublishableKey',
              type: 'text',
              label: adminLabel('Публічний ключ Stripe', 'Публичный ключ Stripe'),
            },
            {
              name: 'stripeWebhookSecret',
              type: 'text',
              label: adminLabel('Секрет вебхука Stripe', 'Секрет вебхука Stripe'),
            },
          ],
        },
        {
          label: adminLabel('Курси валют', 'Курсы валют'),
          fields: [
            {
              name: 'usdRate',
              type: 'number',
              label: adminLabel('Курс USD (НБУ), грн', 'Курс USD (НБУ), грн'),
              admin: {
                readOnly: true,
                description: adminLabel(
                  'Оновлюється автоматично раз на день.',
                  'Обновляется автоматически раз в день.',
                ),
              },
            },
            {
              name: 'eurRate',
              type: 'number',
              label: adminLabel('Курс EUR (НБУ), грн', 'Курс EUR (НБУ), грн'),
              admin: {
                readOnly: true,
                description: adminLabel(
                  'Оновлюється автоматично раз на день.',
                  'Обновляется автоматически раз в день.',
                ),
              },
            },
            {
              name: 'ratesUpdatedAt',
              type: 'text',
              label: adminLabel('Курс оновлено', 'Курс обновлен'),
              admin: { readOnly: true },
            },
          ],
        },
        {
          label: adminLabel('Логотип', 'Логотип'),
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: adminLabel('Логотип сайту', 'Логотип сайта'),
              admin: {
                description: adminLabel(
                  'Необов’язково. Рекомендована ширина — 400–600 пікселів, PNG або WebP. Якщо поле порожнє, показується стандартний логотип.',
                  'Необязательно. Рекомендуемая ширина — 400–600 пикселей, PNG или WebP. Если поле пустое, показывается стандартный логотип.',
                ),
              },
            },
          ],
        },
        {
          label: adminLabel('Інше', 'Другое'),
          fields: [
            {
              name: 'siteURL',
              type: 'text',
              label: adminLabel('Публічна URL-адреса сайту', 'Публичный URL-адрес сайта'),
              admin: {
                description: adminLabel(
                  'Основна адреса магазину (наприклад, https://example.com). Використовується для посилань товарів і фідів.',
                  'Основной адрес магазина (например, https://example.com). Используется в ссылках на товары и фидах.',
                ),
              },
            },
            { name: 'siteName', type: 'text', label: adminLabel('Назва сайту', 'Название сайта') },
            {
              name: 'companyName',
              type: 'text',
              label: adminLabel('Назва компанії', 'Название компании'),
            },
            {
              name: 'previewSecret',
              type: 'text',
              label: adminLabel(
                'Секрет попереднього перегляду',
                'Секрет предварительного просмотра',
              ),
            },
          ],
        },
        {
          label: adminLabel('Інтеграції API', 'Интеграции API'),
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
