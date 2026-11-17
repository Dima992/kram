import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const FormBlock: Block = {
  slug: 'formBlock',
  interfaceName: 'FormBlock',
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
    },
    {
      name: 'enableIntro',
      type: 'checkbox',
      label: adminLabel('Показувати вступний текст', 'Показывать вступительный текст'),
    },
    {
      name: 'introContent',
      type: 'richText',
      admin: {
        condition: (_, { enableIntro }) => Boolean(enableIntro),
      },
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
  ],
  graphQL: {
    singularName: 'FormBlock',
  },
  labels: {
    plural: adminLabel('Блоки форм', 'Блоки форм'),
    singular: adminLabel('Блок форми', 'Блок формы'),
  },
}
