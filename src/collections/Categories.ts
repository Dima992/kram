import { revalidatePath } from 'next/cache'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { transliterate } from '@/utilities/transliterate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'parent'],
  },
  hooks: {
    // После сохранения или удаления категории обновляем страницы магазина
    afterChange: [
      () => {
        revalidatePath('/shop', 'layout')
      },
    ],
    afterDelete: [
      () => {
        revalidatePath('/shop', 'layout')
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true, // Включаем перевод названия категории (UK / RU)
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Батьківська категорія',
      admin: {
        position: 'sidebar',
        description: 'Порожньо — верхній рівень. Наприклад, «Шуби» можна вкласти в «Верхній одяг».',
      },
      // Нельзя выбрать саму категорию в качестве родителя
      filterOptions: ({ id }) => {
        if (id) return { id: { not_equals: id } }
        return true
      },
      // Не даём создать цикл (A → B → A)
      validate: async (value: unknown, { id, req }: { id?: unknown; req: any }) => {
        if (!value) return true
        let currentId: unknown = value
        for (let depth = 0; depth < 10; depth++) {
          if (id !== undefined && String(currentId) === String(id)) {
            return 'Категорія не може бути вкладена сама в себе'
          }
          const doc = await req.payload
            .findByID({ collection: 'categories', id: currentId, depth: 0, overrideAccess: true, req })
            .catch(() => null)
          if (!doc || !doc.parent) return true
          currentId = typeof doc.parent === 'object' ? doc.parent.id : doc.parent
        }
        return true
      },
    },
    slugField({
      position: undefined,
      // Адрес берём из украинского названия и переводим кириллицу в латиницу
      slugify: async ({ valueToSlugify, data, req }) => {
        const base = transliterate(String(valueToSlugify ?? ''))
        if (!base) return ''

        let candidate = base
        for (let n = 2; ; n++) {
          const found = await req.payload.find({
            collection: 'categories',
            where: {
              and: [
                { slug: { equals: candidate } },
                ...(data?.id ? [{ id: { not_equals: data.id } }] : []),
              ],
            },
            limit: 1,
            depth: 0,
            pagination: false,
            req,
          })

          if (found.docs.length === 0) return candidate
          candidate = `${base}-${n}`
        }
      },
    }),
  ],
}