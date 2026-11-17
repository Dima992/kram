import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const Archive: Block = {
  slug: 'archive',
  interfaceName: 'ArchiveBlock',
  fields: [
    {
      name: 'introContent',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: adminLabel('Вступний текст', 'Вступительный текст'),
    },
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: adminLabel('Колекція', 'Коллекция'),
          value: 'collection',
        },
        {
          label: adminLabel('Вибрати вручну', 'Выбрать вручную'),
          value: 'selection',
        },
      ],
    },
    {
      name: 'relationTo',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      defaultValue: 'products',
      label: adminLabel('Що показувати', 'Что показывать'),
      options: [
        {
          label: adminLabel('Товари', 'Товары'),
          value: 'products',
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      hasMany: true,
      label: adminLabel('Категорії', 'Категории'),
      relationTo: 'categories',
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        step: 1,
      },
      defaultValue: 10,
      label: adminLabel('Кількість товарів', 'Количество товаров'),
    },
    {
      name: 'selectedDocs',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'selection',
      },
      hasMany: true,
      label: adminLabel('Вибрані товари', 'Выбранные товары'),
      relationTo: ['products'],
    },
  ],
  labels: {
    plural: adminLabel('Архіви', 'Архивы'),
    singular: adminLabel('Архів', 'Архив'),
  },
}
