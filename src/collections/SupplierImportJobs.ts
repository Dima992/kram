import { adminOnly } from '@/access/adminOnly'
import type { CollectionConfig } from 'payload'

export const SupplierImportJobs: CollectionConfig = {
  slug: 'supplier-import-jobs',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: { hidden: true },
  fields: [
    {
      name: 'supplierRef',
      type: 'relationship',
      relationTo: 'import-sources',
      required: true,
      index: true,
    },
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
    { name: 'rows', type: 'json', required: true },
    { name: 'nextIndex', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'У черзі', value: 'queued' },
        { label: 'Обробляється', value: 'processing' },
        { label: 'Завершено', value: 'completed' },
      ],
    },
    { name: 'totalRows', type: 'number', required: true },
    { name: 'failedRows', type: 'number', required: true, defaultValue: 0 },
    { name: 'telegramChannel', type: 'text' },
  ],
}
