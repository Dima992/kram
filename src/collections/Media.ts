import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'
import { deleteUnusedMedia, listUnusedMedia, UNUSED_MIN_AGE_DAYS } from '@/utilities/unusedMedia'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  admin: {
    group: 'Content',
    // Панель «Невикористані фото» над списком фото в админке
    components: {
      beforeListTable: ['@/components/admin/UnusedMediaPanel#UnusedMediaPanel'],
    },
  },
  slug: 'media',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  endpoints: [
    {
      // Список неиспользуемых файлов (только просмотр)
      path: '/unused',
      method: 'get',
      handler: async (req) => {
        if (!adminOnly({ req } as any)) {
          return Response.json({ error: 'Немає доступу' }, { status: 403 })
        }
        const rows = await listUnusedMedia(req.payload)
        return Response.json({ rows, minAgeDays: UNUSED_MIN_AGE_DAYS })
      },
    },
    {
      // Удаление выбранных файлов (после подтверждения в админке)
      path: '/unused-delete',
      method: 'post',
      handler: async (req) => {
        if (!adminOnly({ req } as any)) {
          return Response.json({ error: 'Немає доступу' }, { status: 403 })
        }
        const body = ((await req.json?.()) ?? {}) as { ids?: unknown }
        const ids = Array.isArray(body.ids)
          ? body.ids.filter((x): x is string => typeof x === 'string')
          : []
        if (ids.length === 0) {
          return Response.json({ error: 'Не вибрано жодного файлу' }, { status: 400 })
        }
        const report = await deleteUnusedMedia(req.payload, req, ids)
        return Response.json(report)
      },
    },
  ],
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