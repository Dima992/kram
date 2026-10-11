import type { CollectionConfig } from 'payload'

export const ApiKeys: CollectionConfig = {
  slug: 'api-keys',
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      maxLength: 100,
      required: true,
    },
    {
      name: 'token',
      type: 'text',
      index: true,
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'tokenHash',
      type: 'text',
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'scopes',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        { label: 'Читання замовлень', value: 'orders:read' },
        { label: 'Запис замовлень', value: 'orders:write' },
        { label: 'Читання товарів', value: 'products:read' },
        { label: 'Запис товарів', value: 'products:write' },
      ],
    },
  ],
}
