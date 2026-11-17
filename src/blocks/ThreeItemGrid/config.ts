import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

export const ThreeItemGrid: Block = {
  slug: 'threeItemGrid',
  fields: [
    {
      name: 'products',
      type: 'relationship',
      admin: {
        isSortable: true,
      },
      hasMany: true,
      label: adminLabel('Товари для показу', 'Товары для отображения'),
      maxRows: 3,
      minRows: 3,
      relationTo: 'products',
    },
  ],
  interfaceName: 'ThreeItemGridBlock',
  labels: {
    plural: adminLabel('Сітки з трьох товарів', 'Сетки из трех товаров'),
    singular: adminLabel('Сітка з трьох товарів', 'Сетка из трех товаров'),
  },
}
