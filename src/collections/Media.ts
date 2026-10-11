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
      name: 'alt',
      type: 'text',
      required: false, // Теперь поле не обязательное, ошибка при сохранении уйдёт
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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Автоматически заполняем alt уникальным хвостом, если он пустой
        if (data && !data.alt) {
          const baseName = data.filename 
            ? data.filename.substring(0, data.filename.lastIndexOf('.')) || data.filename 
            : 'image'
          
          const uniqueId = Date.now().toString().slice(-6)
          data.alt = `${baseName}-${uniqueId}`
        }
        return data
      },
    ],
  },
  upload: {
    disableLocalStorage: true,
    staticDir: path.resolve(dirname, '../../public/media'),
  },
}