import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from './linkGroup'
import { adminLabel } from '@/utilities/adminLabel'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: adminLabel('Тип обкладинки', 'Тип обложки'),
      options: [
        {
          label: adminLabel('Немає', 'Нет'),
          value: 'none',
        },
        {
          label: adminLabel('Великий банер', 'Большой баннер'),
          value: 'highImpact',
        },
        {
          label: adminLabel('Середній банер', 'Средний баннер'),
          value: 'mediumImpact',
        },
        {
          label: adminLabel('Малий банер', 'Маленький баннер'),
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
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
      label: false,
    },
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'media',
      type: 'upload',
      label: adminLabel('Медіафайл', 'Медиафайл'),
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
      },
      relationTo: 'media',
      required: true,
    },
  ],
  label: false,
}
