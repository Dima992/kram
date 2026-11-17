import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { link } from '@/fields/link'
import { adminLabel } from '@/utilities/adminLabel'

export const Header: GlobalConfig = {
  slug: 'header',
  label: adminLabel('Шапка сайту', 'Шапка сайта'),
  access: {
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      label: adminLabel('Пункти меню', 'Пункты меню'),
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
    },
  ],
}
