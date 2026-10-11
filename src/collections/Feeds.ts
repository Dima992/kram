import { adminOnly } from '@/access/adminOnly'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import type { CollectionConfig } from 'payload'

export const Feeds: CollectionConfig = {
  slug: 'feeds',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Marketing',
    useAsTitle: 'title',
    defaultColumns: ['title', 'platform', 'language', 'feedURL', 'updatedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Назва фіда',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Частина посилання після /api/feed/ (наприклад: google-all або tiktok-main).',
      },
    },
    {
      name: 'feedURL',
      type: 'text',
      label: 'Посилання на фід',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Скопіюйте це посилання в налаштування товарного каталогу.',
      },
      hooks: {
        beforeChange: [
          async ({ data, originalDoc, req }) => {
            const slug = data?.slug || originalDoc?.slug
            if (!slug) return ''

            const settings = await req.payload.findGlobal({
              slug: 'site-settings',
              depth: 0,
              overrideAccess: true,
            })
            const baseURL = getPublicSiteURL(settings.siteURL)

            return `${baseURL}/api/feed/${encodeURIComponent(slug)}`
          },
        ],
      },
    },
    {
      name: 'platform',
      type: 'select',
      required: true,
      defaultValue: 'google',
      options: [
        { label: 'Google Merchant Center', value: 'google' },
        { label: 'Facebook / Meta Catalog', value: 'meta' },
        { label: 'TikTok Catalog', value: 'tiktok' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'uk',
      options: [
        { label: 'Українська (UK)', value: 'uk' },
        { label: 'Русский (RU)', value: 'ru' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Мова назв та описів товарів у фіді.',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Фід активний',
      admin: {
        position: 'sidebar',
        description: 'Вимкнений фід не буде доступний за посиланням.',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description:
          'Необов’язково. Якщо категорії не вибрані, фід включатиме всі товари, крім виключених нижче.',
      },
    },
    {
      name: 'includeProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description:
          'Необов’язково. Ці товари будуть додані до фіда навіть поза вибраними категоріями.',
      },
    },
    {
      name: 'excludeProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description: 'Товари, які потрібно виключити лише з цього фіда.',
      },
    },
    {
      name: 'onlyInStock',
      type: 'checkbox',
      defaultValue: true,
      label: 'Вивантажувати тільки товари в наявності',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'defaultBrand',
      type: 'text',
      label: 'Бренд за замовчуванням',
      admin: {
        description:
          'Буде використаний, якщо для товару не вказаний власний бренд. Для Google це рекомендоване поле.',
      },
    },
  ],
}
