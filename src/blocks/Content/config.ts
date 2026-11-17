import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { adminLabel } from '@/utilities/adminLabel'

const columnFields: Field[] = [
  {
    name: 'size',
    type: 'select',
    label: adminLabel('Розмір колонки', 'Размер колонки'),
    defaultValue: 'oneThird',
    options: [
      {
        label: adminLabel('Одна третина', 'Одна треть'),
        value: 'oneThird',
      },
      {
        label: adminLabel('Половина', 'Половина'),
        value: 'half',
      },
      {
        label: adminLabel('Дві третини', 'Две трети'),
        value: 'twoThirds',
      },
      {
        label: adminLabel('На всю ширину', 'На всю ширину'),
        value: 'full',
      },
    ],
  },
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ]
      },
    }),
    label: false,
  },
  {
    name: 'enableLink',
    type: 'checkbox',
    label: adminLabel('Додати посилання', 'Добавить ссылку'),
  },
  link({
    overrides: {
      admin: {
        condition: (_: unknown, { enableLink }: { enableLink?: boolean }) => Boolean(enableLink),
      },
    },
  }),
]

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: {
    singular: adminLabel('Текстовий блок', 'Текстовый блок'),
    plural: adminLabel('Текстові блоки', 'Текстовые блоки'),
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      label: adminLabel('Колонки', 'Колонки'),
      admin: {
        initCollapsed: true,
      },
      fields: columnFields,
    },
  ],
}
