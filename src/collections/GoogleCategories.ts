import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

// Тег Google: только маленькие латинские буквы, цифры и подчёркивание
const validateGoogleTags = (value: unknown) => {
  if (!Array.isArray(value)) return true
  const ok = value.every((tag) => typeof tag === 'string' && /^[a-z][a-z0-9_]*$/.test(tag))
  return ok ? true : 'Только маленькие латинские буквы, цифры и _ (например color, weight). Без пробелов.'
}

export const GoogleCategories: CollectionConfig = {
  slug: 'google-categories',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name_uk',
    group: 'Content',
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
          label: 'Назва (укр)',
          admin: { width: '50%', description: 'Наприклад: Плаття, Шуби.' },
        },
        {
          name: 'name_ru',
          type: 'text',
          label: 'Название (рус)',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'googleId',
      type: 'number',
      required: true,
      label: 'Номер Google',
      admin: {
        description: 'Номер из официального списка Google, например 2271 для платьев.',
      },
    },
    {
      name: 'path',
      type: 'text',
      required: true,
      label: 'Шлях Google',
      admin: {
        description: 'Например: Apparel & Accessories > Clothing > Dresses',
      },
    },
    {
      // Теги Google, которые обязательны для этой категории (вписываете вручную)
      name: 'requiredFields',
      type: 'text',
      hasMany: true,
      label: "Поля, які підсвічувати (обов'язкові для Google)",
      validate: validateGoogleTags,
      admin: {
        description:
          'Теги Google маленькими латинскими буквами, по одному в строке: gender, color, size, material. Должны совпадать с Google-тегом в характеристиках.',
      },
    },
  ],
}