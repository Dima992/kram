import { revalidatePath, revalidateTag } from 'next/cache'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const Characteristics: CollectionConfig = {
  slug: 'characteristics',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name_uk',
    group: 'Content',
    defaultColumns: ['order', 'name_uk', 'name_ru', 'categories'],
  },
  defaultSort: 'order',
  hooks: {
    // После сохранения или удаления характеристики обновляем страницы товаров и магазина
    afterChange: [
      () => {
        revalidateTag('products', { expire: 0 })
        revalidatePath('/shop', 'layout')
        revalidatePath('/products', 'layout')
      },
    ],
    afterDelete: [
      () => {
        revalidateTag('products', { expire: 0 })
        revalidatePath('/shop', 'layout')
        revalidatePath('/products', 'layout')
      },
    ],
  },
  fields: [
    {
      // Название укр и рус рядом, без переключения языка
      type: 'row',
      fields: [
        {
          name: 'name_uk',
          type: 'text',
          required: true,
          label: 'Назва (укр)',
          admin: {
            width: '50%',
            description: 'Наприклад: Матеріал, Стать, Сезон.',
          },
        },
        {
          name: 'name_ru',
          type: 'text',
          label: 'Название (рус)',
          admin: {
            width: '50%',
            description: 'Если пусто, покажем украинское.',
          },
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Порядок',
      admin: {
        position: 'sidebar',
        description: 'Чем меньше число, тем выше характеристика в карточке товара (1, 2, 3…).',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Категорії',
      admin: {
        position: 'sidebar',
        description: 'Для яких категорій ця характеристика. Підкатегорії успадковують її від батьківської.',
      },
    },
    {
      name: 'values',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Значення',
      admin: {
        description: 'Варіанти, які можна буде вибрати в товарі галочками. Общие значения (S, M, 90 см) заполните в обоих полях одинаково.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label_uk',
              type: 'text',
              required: true,
              label: 'Укр',
              admin: { width: '50%' },
            },
            {
              name: 'label_ru',
              type: 'text',
              label: 'Рус',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
  ],
}