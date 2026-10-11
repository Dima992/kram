import { adminOnly } from '@/access/adminOnly'
import type { CollectionConfig } from 'payload'
import { syncApprovedSupplierImport } from '@/utilities/supplierImportProducts'

export const SupplierImports: CollectionConfig = {
  slug: 'supplier-imports',
  labels: {
    singular: 'Запис на модерацію',
    plural: 'Імпорт / Експорт і Модерація',
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Імпорт / Експорт і Модерація',
    useAsTitle: 'sourceRecordKey',
    defaultColumns: ['sourceType', 'supplierRef', 'mappingStatus', 'status', 'createdAt'],
    description:
      'Вхідні товари зберігаються окремо. Після перевірки встановіть статус «Одобрен» — тоді товар буде створено або оновлено в каталозі.',
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data?.status === 'approved' && !data?.mappedData && !originalDoc?.mappedData) {
          throw new Error('Не можна затвердити запис без результату маппінгу.')
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (
          doc.status !== 'approved' ||
          (previousDoc?.status === 'approved' && doc.product)
        ) {
          return doc
        }
        await syncApprovedSupplierImport(req.payload, doc)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Файл', value: 'file' },
        { label: 'URL-фід', value: 'url' },
        { label: 'Telegram', value: 'telegram' },
      ],
    },
    {
      name: 'supplierRef',
      type: 'relationship',
      relationTo: 'import-sources',
      required: true,
      index: true,
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'sourceRecordKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'rawPayload',
      type: 'json',
      required: true,
      admin: { description: 'Оригінальні дані джерела; не змінюються AI-маппером.' },
    },
    {
      name: 'mappedData',
      type: 'json',
      admin: { description: 'Переклади, SEO та нормалізовані поля товару.' },
    },
    {
      name: 'mappingStatus',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'У черзі', value: 'queued' },
        { label: 'Обробляється', value: 'processing' },
        { label: 'Готово', value: 'completed' },
        { label: 'Помилка', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'mappingError',
      type: 'textarea',
      admin: { readOnly: true },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'На модерації', value: 'pending' },
        { label: 'Затверджений', value: 'approved' },
        { label: 'Відхилений', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
