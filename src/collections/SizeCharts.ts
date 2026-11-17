import {
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { revalidateTag } from 'next/cache'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminLabel } from '@/utilities/adminLabel'

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
    group: adminLabel('Контент', 'Контент'),
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
      label: adminLabel('Назва для адмінки', 'Название для админки'),
      admin: {
        description: adminLabel(
          'Наприклад: Плаття. Покупець цього не бачить.',
          'Например: Платья. Покупатель этого не видит.',
        ),
      },
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      label: adminLabel('Заголовок (укр / рус)', 'Заголовок (укр. / рус.)'),
      admin: {
        description: adminLabel(
          'Наприклад: Таблиця розмірів: плаття',
          'Например: Таблица размеров: платья',
        ),
      },
    },
    {
      name: 'table',
      type: 'richText',
      localized: true,
      label: adminLabel('Таблиця розмірів', 'Таблица размеров'),
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
