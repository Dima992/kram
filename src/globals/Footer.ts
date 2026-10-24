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
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
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
  ],
}