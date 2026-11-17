import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

export const Carousel: Block = {
  slug: 'carousel',
  fields: [
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: adminLabel('Колекція', 'Коллекция'),
          value: 'collection',
        },
        {
          label: adminLabel('Вибрати вручну', 'Выбрать вручную'),
          value: 'selection',
        },
      ],
    },
    {
      name: 'relationTo',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      defaultValue: 'products',
      label: adminLabel('Що показувати', 'Что показывать'),
      options: [
        {
          label: adminLabel('Товари', 'Товары'),
          value: 'products',
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      hasMany: true,
      label: adminLabel('Категорії', 'Категории'),
      relationTo: 'categories',
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        step: 1,
      },
      defaultValue: 10,
      label: adminLabel('Кількість товарів', 'Количество товаров'),
    },
    {
      name: 'selectedDocs',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'selection',
      },
      hasMany: true,
      label: adminLabel('Вибрані товари', 'Выбранные товары'),
      relationTo: ['products'],
    },
    {
      name: 'populatedDocs',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        description: adminLabel(
          'Заповнюється автоматично після читання.',
          'Заполняется автоматически после загрузки.',
        ),
        disabled: true,
      },
      hasMany: true,
      label: adminLabel('Завантажені документи', 'Загруженные документы'),
      relationTo: ['products'],
    },
    {
      name: 'populatedDocsTotal',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        description: adminLabel(
          'Заповнюється автоматично після читання.',
          'Заполняется автоматически после загрузки.',
        ),
        disabled: true,
        step: 1,
      },
      label: adminLabel('Кількість завантажених документів', 'Количество загруженных документов'),
    },
  ],
  interfaceName: 'CarouselBlock',
  labels: {
    plural: adminLabel('Каруселі', 'Карусели'),
    singular: adminLabel('Карусель', 'Карусель'),
  },
}
