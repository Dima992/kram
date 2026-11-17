import {
    EXPERIMENTAL_TableFeature,
    FixedToolbarFeature,
    HeadingFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { revalidateTag } from 'next/cache'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

// После любого изменения сетки обновляем страницы товаров
const refreshProducts = () => {
  revalidateTag('products', { expire: 0 })
}

export const SizeCharts: CollectionConfig = {
  slug: 'size-charts',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    group: 'Content',
    useAsTitle: 'adminName',
    defaultColumns: ['adminName', 'updatedAt'],
  },
  hooks: {
    afterChange: [refreshProducts],
    afterDelete: [refreshProducts],
  },
  fields: [
    {
      name: 'adminName',
      type: 'text',
      required: true,
      label: 'Назва для адмінки',
      admin: {
        description: 'Наприклад: Плаття. Покупець цього не бачить.',
      },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: 'Заголовок (укр / рус)',
      admin: {
        description: 'Наприклад: Таблиця розмірів: плаття',
      },
    },
    {
      name: 'table',
      type: 'richText',
      localized: true,
      label: 'Таблиця розмірів',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
          EXPERIMENTAL_TableFeature(),
          FixedToolbarFeature(),
        ],
      }),
    },
  ],
}