import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '@/access/adminOnly'

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
    }),
  ],
}