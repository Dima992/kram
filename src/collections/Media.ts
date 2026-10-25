import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  admin: {
    group: 'Content',
  },
  slug: 'media',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      // Описание фото для людей и поисковиков. Заполняется автоматически из названия товара.
      name: 'alt',
      type: 'text',
      required: false,
      localized: true,
    },
    {
      name: 'caption',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    disableLocalStorage: true,
    staticDir: path.resolve(dirname, '../../public/media'),
    // Точка фокуса: кружок, которым задаётся важная часть фото
    focalPoint: true,
    // Размеры: карточка 3:4 и статья 1:1
    imageSizes: [
      {
        name: 'large',
        width: 1200,
        height: 1600,
        fit: 'cover',
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'thumbnail',
        width: 600,
        height: 800,
        fit: 'cover',
        formatOptions: { format: 'webp', options: { quality: 75 } },
      },
      {
        name: 'square',
        width: 800,
        height: 800,
        fit: 'cover',
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
    ],
  },
}