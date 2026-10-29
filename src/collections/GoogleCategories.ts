import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

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
      // Поля, которые подсвечиваются жёлтым, если не заполнены
      name: 'requiredFields',
      type: 'select',
      hasMany: true,
      label: 'Поля, які підсвічувати (обов\'язкові для Google)',
      options: [
        { label: 'Пол (gender)', value: 'gender' },
        { label: 'Возрастная группа (age_group)', value: 'age_group' },
        { label: 'Цвет (color)', value: 'color' },
        { label: 'Размер (size)', value: 'size' },
        { label: 'Материал (material)', value: 'material' },
        { label: 'Состояние (condition)', value: 'condition' },
        { label: 'Бренд (brand)', value: 'brand' },
        { label: 'Штрихкод или артикул (gtin / mpn)', value: 'gtin' },
      ],
      admin: {
        description: 'Отметьте поля, которые нужно заполнить для этой категории.',
      },
    },
  ],
}