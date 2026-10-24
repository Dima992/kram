import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { link } from '@/fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      name: 'navItems',
      label: 'Ссылки колонки «Информация»',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
    },
    {
      name: 'contacts',
      label: 'Контакты',
      type: 'group',
      fields: [
        {
          name: 'phones',
          label: 'Телефоны',
          type: 'array',
          fields: [
            {
              name: 'label',
              label: 'Подпись (необязательно, например, Основной)',
              type: 'text',
            },
            {
              name: 'number',
              label: 'Номер (например, +380962063144)',
              type: 'text',
              required: true,
            },
            {
              name: 'enabled',
              label: 'Показывать на сайте',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'emails',
          label: 'Эл. почта',
          type: 'array',
          fields: [
            {
              name: 'email',
              label: 'Адрес (например, info@kramnyca.com.ua)',
              type: 'email',
              required: true,
            },
            {
              name: 'enabled',
              label: 'Показывать на сайте',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'address',
          label: 'Адрес магазина',
          type: 'text',
        },
        {
          name: 'other',
          label: 'Другое (любые дополнительные контакты)',
          type: 'array',
          fields: [
            {
              name: 'label',
              label: 'Название (например, График работы)',
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              label: 'Значение',
              type: 'text',
              required: true,
            },
            {
              name: 'enabled',
              label: 'Показывать на сайте',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
    {
      name: 'socials',
      label: 'Соцсети',
      type: 'array',
      fields: [
        {
          name: 'platform',
          label: 'Соцсеть',
          type: 'select',
          required: true,
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Telegram', value: 'telegram' },
            { label: 'Viber', value: 'viber' },
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Pinterest', value: 'pinterest' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'Другое', value: 'other' },
          ],
        },
        {
          name: 'customName',
          label: 'Название соцсети',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.platform === 'other',
          },
        },
        {
          name: 'url',
          label: 'Ссылка (вставьте полностью)',
          type: 'text',
          required: true,
        },
        {
          name: 'enabled',
          label: 'Показывать на сайте',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      name: 'paymentMethods',
      label: 'Способы оплаты (логотипы в футере)',
      type: 'array',
      admin: {
        description:
          'Загружайте логотип в формате SVG (лучше) или PNG с прозрачным фоном. PNG: ширина 240 px, высота 80 px, файл до 100 КБ. JPG не загружайте (белый фон). Галочка «Показывать» выключена по умолчанию: включите её, когда подключите оплату. Порядок меняется перетаскиванием.',
      },
      fields: [
        {
          name: 'name',
          label: 'Название (например, Visa)',
          type: 'text',
          required: true,
        },
        {
          name: 'logo',
          label: 'Логотип',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'enabled',
          label: 'Показывать на сайте',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}