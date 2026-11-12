import { revalidatePath, revalidateTag } from 'next/cache'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

// Тег Google: только маленькие латинские буквы, цифры и подчёркивание (например color, weight)
const validateGoogleTag = (value: unknown) => {
  if (value === null || value === undefined || value === '') return true
  return typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value)
    ? true
    : 'Только маленькие латинские буквы, цифры и _ (например color, weight). Без пробелов.'
}

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
    defaultColumns: ['adminNote', 'order', 'name_uk', 'name_ru', 'categories', 'googleAttribute'],
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
      // Внутреннее название для админки (покупатель его не видит)
      name: 'adminNote',
      type: 'text',
      label: 'Коментар для адмінки',
      admin: {
        position: 'sidebar',
        description:
          'Например «Колір шуб». Показывается в карточке товара в скобках. Покупатель не видит.',
      },
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
      // Тег Google, который получит значение этой характеристики (пишете вручную)
      name: 'googleAttribute',
      type: 'text',
      label: 'Google-тег',
      validate: validateGoogleTag,
      admin: {
        position: 'sidebar',
        description:
          'Название тега Google маленькими латинскими буквами, например gender, color, size, material, weight. Если в фид не нужно, оставьте пусто.',
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
        description:
          'Для яких категорій ця характеристика. Підкатегорії успадковують її від батьківської. Якщо не вибрано — характеристика діє на весь магазин.',
      },
    },
    {
      name: 'values',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Значення',
      admin: {
        description:
          'Варіанти, які можна буде вибрати в товарі галочками. Общие значения (S, M, 90 см) заполните в обоих полях одинаково.',
        components: {
          // Подпись строки: название значения вместо «Value 01»
          RowLabel: '@/components/admin/CharacteristicValueRowLabel#CharacteristicValueRowLabel',
        },
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
              admin: { width: '34%' },
            },
            {
              name: 'label_ru',
              type: 'text',
              label: 'Рус',
              admin: { width: '33%' },
            },
            {
              // Код для Google, латиницей (уходит в фид, покупатель его не видит)
              name: 'googleValue',
              type: 'text',
              label: 'Google-значение',
              admin: {
                width: '33%',
                description: 'Код для Google латиницей: female, male, unisex, adult, wool и т. д.',
              },
            },
          ],
        },
      ],
    },
  ],
}