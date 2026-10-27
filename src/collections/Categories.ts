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
    // В выборе категории в товаре показываем полный путь
    useAsTitle: 'pathTitle',
    group: 'Content',
    defaultColumns: ['pathTitle', 'title'],
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
    // Собираем полный путь: родитель → подкатегория (по украинским названиям)
    beforeChange: [
      async ({ data, req }) => {
        const doc = data as any
        const names: string[] = [typeof doc?.title === 'string' ? doc.title : '']

        let parentId = doc?.parent
          ? typeof doc.parent === 'object'
            ? doc.parent.id
            : doc.parent
          : null
        let guard = 0

        while (parentId && guard < 10) {
          const parent: any = await req.payload
            .findByID({
              collection: 'categories',
              id: parentId,
              locale: 'uk',
              depth: 0,
              overrideAccess: true,
              req,
            })
            .catch(() => null)
          if (!parent) break

          names.unshift(parent.title)
          parentId = parent.parent
            ? typeof parent.parent === 'object'
              ? parent.parent.id
              : parent.parent
            : null
          guard++
        }

        doc.pathTitle = names.filter(Boolean).join(' → ')
        return doc
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
      name: 'pathTitle',
      type: 'text',
      label: 'Повний шлях (автоматично)',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Заповнюється сам при збереженні. Не редагуйте вручну.',
      },
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