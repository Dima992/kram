import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const Characteristics: CollectionConfig = {
  slug: 'characteristics',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'categories'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: 'Назва характеристики',
      admin: {
        description: 'Наприклад: Матеріал, Стать, Сезон. Назва на двох мовах.',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Категорії',
      admin: {
        position: 'sidebar',
        description: 'Для яких категорій ця характеристика. Підкатегорії успадковують її від батьківської.',
      },
    },
    {
      name: 'values',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Значення',
      admin: {
        description: 'Варіанти, які можна буде вибрати в товарі (галочками).',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          label: 'Значення',
        },
      ],
    },
  ],
}