import { revalidatePath, revalidateTag } from 'next/cache'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminLabel } from '@/utilities/adminLabel'

// Тег Google: только маленькие латинские буквы, цифры и подчёркивание (например color, weight)
const validateGoogleTag = (value: unknown) => {
  if (value === null || value === undefined || value === '') return true
  return typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value)
    ? true
    : 'Только маленькие латинские буквы, цифры и _ (например color, weight). Без пробелов.'
}

export const Characteristics: CollectionConfig = {
  slug: 'characteristics',
  labels: {
    singular: adminLabel('Характеристика', 'Характеристика'),
    plural: adminLabel('Характеристики', 'Характеристики'),
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name_uk',
    group: adminLabel('Контент', 'Контент'),
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
          label: adminLabel('Назва (укр)', 'Название (укр.)'),
          admin: {
            width: '50%',
            description: adminLabel(
              'Наприклад: Матеріал, Стать, Сезон.',
              'Например: материал, пол, сезон.',
            ),
          },
        },
        {
          name: 'name_ru',
          type: 'text',
          label: adminLabel('Название (рус)', 'Название (рус.)'),
          admin: {
            width: '50%',
            description: adminLabel(
              'Якщо порожньо, покажемо українську назву.',
              'Если пусто, покажем украинское название.',
            ),
          },
        },
      ],
    },
    {
      // Внутреннее название для админки (покупатель его не видит)
      name: 'adminNote',
      type: 'text',
      label: adminLabel('Коментар для адмінки', 'Комментарий для админки'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Наприклад «Колір шуб». Показується в картці товару в дужках. Покупець не бачить.',
          'Например, «Цвет шубы». Показывается в карточке товара в скобках. Покупатель не видит.',
        ),
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: adminLabel('Порядок', 'Порядок'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Що менше число, то вище характеристика в картці товару (1, 2, 3…).',
          'Чем меньше число, тем выше характеристика в карточке товара (1, 2, 3…).',
        ),
      },
    },
    {
      // Тег Google, который получит значение этой характеристики (пишете вручную)
      name: 'googleAttribute',
      type: 'text',
      label: adminLabel('Тег Google', 'Тег Google'),
      validate: validateGoogleTag,
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Назва тегу Google малими латинськими літерами, наприклад gender, color, size, material, weight. Якщо для фіда не потрібен, залиште порожнім.',
          'Название тега Google строчными латинскими буквами, например gender, color, size, material, weight. Если для фида не нужен, оставьте пустым.',
        ),
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: adminLabel('Категорії', 'Категории'),
      admin: {
        position: 'sidebar',
        description: adminLabel(
          'Для яких категорій ця характеристика. Підкатегорії успадковують її від батьківської. Якщо не вибрано — характеристика діє на весь магазин.',
          'Для каких категорий предназначена характеристика. Подкатегории наследуют её от родительской. Если не выбрано — действует для всего магазина.',
        ),
      },
    },
    {
      name: 'values',
      type: 'array',
      required: true,
      minRows: 1,
      label: adminLabel('Значення', 'Значения'),
      admin: {
        description: adminLabel(
          'Варіанти, які можна буде вибрати в товарі галочками. Спільні значення (S, M, 90 см) заповніть в обох полях однаково.',
          'Варианты, которые можно будет выбрать в товаре. Общие значения (S, M, 90 см) заполните в обоих полях одинаково.',
        ),
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
              label: adminLabel('Укр', 'Укр.'),
              admin: { width: '34%' },
            },
            {
              name: 'label_ru',
              type: 'text',
              label: adminLabel('Рус', 'Рус.'),
              admin: { width: '33%' },
            },
            {
              // Код для Google, латиницей (уходит в фид, покупатель его не видит)
              name: 'googleValue',
              type: 'text',
              label: adminLabel('Значення для Google', 'Значение для Google'),
              admin: {
                width: '33%',
                description: adminLabel(
                  'Код для Google латиницею: female, male, unisex, adult, wool тощо.',
                  'Код для Google латиницей: female, male, unisex, adult, wool и т. д.',
                ),
              },
            },
          ],
        },
      ],
    },
  ],
}
