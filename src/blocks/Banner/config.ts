import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const Banner: Block = {
  slug: 'banner',
  fields: [
    {
      name: 'style',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: adminLabel('Інформація', 'Информация'), value: 'info' },
        { label: adminLabel('Попередження', 'Предупреждение'), value: 'warning' },
        { label: adminLabel('Помилка', 'Ошибка'), value: 'error' },
        { label: adminLabel('Успіх', 'Успех'), value: 'success' },
      ],
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
      label: false,
      required: true,
    },
  ],
  interfaceName: 'BannerBlock',
}
