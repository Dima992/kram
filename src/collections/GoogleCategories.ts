import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminLabel } from '@/utilities/adminLabel'

// Тег Google: только маленькие латинские буквы, цифры и подчёркивание
const validateGoogleTags = (value: unknown) => {
  if (!Array.isArray(value)) return true
  const ok = value.every((tag) => typeof tag === 'string' && /^[a-z][a-z0-9_]*$/.test(tag))
  return ok
    ? true
    : 'Только маленькие латинские буквы, цифры и _ (например color, weight). Без пробелов.'
}

export const GoogleCategories: CollectionConfig = {
  slug: 'google-categories',
  labels: {
    singular: adminLabel('Категорія Google', 'Категория Google'),
    plural: adminLabel('Категорії Google', 'Категории Google'),
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
    defaultColumns: ['name_uk', 'googleId', 'path'],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name_uk',
          type: 'text',
          required: true,
          label: adminLabel('Назва (укр)', 'Название (укр.)'),
          admin: {
            width: '50%',
            description: adminLabel('Наприклад: Плаття, Шуби.', 'Например: Платья, шубы.'),
          },
        },
        {
          name: 'name_ru',
          type: 'text',
          label: adminLabel('Назва (рос.)', 'Название (рус.)'),
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'googleId',
      type: 'number',
      required: true,
      label: adminLabel('Номер Google', 'Номер Google'),
      admin: {
        description: adminLabel(
          'Номер з офіційного списку Google, наприклад 2271 для суконь.',
          'Номер из официального списка Google, например 2271 для платьев.',
        ),
      },
    },
    {
      name: 'path',
      type: 'text',
      required: true,
      label: adminLabel('Шлях Google', 'Путь Google'),
      admin: {
        description: adminLabel(
          'Наприклад: Apparel & Accessories > Clothing > Dresses',
          'Например: Apparel & Accessories > Clothing > Dresses',
        ),
      },
    },
    {
      // Теги Google, которые обязательны для этой категории (вписываете вручную)
      name: 'requiredFields',
      type: 'text',
      hasMany: true,
      label: adminLabel(
        "Поля, які підсвічувати (обов'язкові для Google)",
        'Поля, которые нужно выделить (обязательные для Google)',
      ),
      validate: validateGoogleTags,
      admin: {
        description: adminLabel(
          'Теги Google малими латинськими літерами, по одному в рядку: gender, color, size, material. Мають збігатися з тегом Google у характеристиках.',
          'Теги Google строчными латинскими буквами, по одному в строке: gender, color, size, material. Должны совпадать с тегом Google в характеристиках.',
        ),
      },
    },
  ],
}
