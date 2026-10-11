import { adminOnly } from '@/access/adminOnly'
import type { CollectionConfig } from 'payload'

export const ImportSources: CollectionConfig = {
  slug: 'import-sources',
  labels: {
    singular: 'Імпорт товарів',
    plural: 'Імпорт товарів',
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Settings',
    useAsTitle: 'name',
    defaultColumns: ['name', 'autoImportEnabled', 'autoImportFrequency', 'lastImportStatus'],
    components: {
      beforeList: ['@/components/BeforeDashboard/ProductTransfer#ProductTransfer'],
      edit: {
        beforeDocumentControls: ['@/components/BeforeDashboard/ImportSourceAction#ImportSourceAction'],
      },
    },
    description:
      'Імпорт товарів із файлів і фідів Google Merchant. Для кожного джерела можна зберегти окремий профіль.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Назва постачальника',
    },
    {
      name: 'sourceKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ value }: { value?: unknown }) =>
            typeof value === 'string' && value ? value : crypto.randomUUID(),
        ],
      },
    },
    {
      name: 'defaultCurrency',
      type: 'select',
      required: true,
      defaultValue: 'UAH',
      options: [
        { label: 'Гривня (UAH)', value: 'UAH' },
        { label: 'Долар США (USD)', value: 'USD' },
        { label: 'Євро (EUR)', value: 'EUR' },
      ],
      admin: {
        description: 'Валюта ціни за замовчуванням, якщо у файлі немає окремої колонки.',
      },
    },
    {
      name: 'supplierFeedURL',
      type: 'text',
      label: 'Посилання на прайс постачальника',
      admin: {
        description:
          'Постійне HTTPS-посилання на CSV/XLSX-файл або XML-фід Google Merchant. Залиште порожнім, якщо завантажуєте файли вручну.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value.trim()) return true
        try {
          const url = new URL(value)
          return url.protocol === 'https:' || 'Посилання на прайс має починатися з https://.'
        } catch {
          return 'Вкажіть повне посилання, наприклад https://supplier.example/price.csv.'
        }
      },
    },
    {
      name: 'autoImportEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Автоматично оновлювати прайс',
      admin: {
        description: 'Увімкніть автоматичне завантаження за розкладом Vercel Cron.',
      },
    },
    {
      name: 'autoImportFrequency',
      type: 'select',
      defaultValue: 'daily',
      options: [
        { label: 'Раз на день', value: 'daily' },
        { label: 'Кожні 4 години (Vercel Pro)', value: 'every4hours' },
      ],
      admin: {
        description:
          'На вашому поточному тарифі Hobby автоматичний запуск можливий лише раз на день. Для запуску кожні 4 години потрібен Vercel Pro.',
      },
    },
    {
      name: 'supplierUsername',
      type: 'text',
      label: 'Логін до прайсу (якщо потрібен)',
      admin: { description: 'Залиште порожнім, якщо посилання не потребує авторизації.' },
    },
    {
      name: 'supplierPassword',
      type: 'text',
      label: 'Пароль до прайсу (якщо потрібен)',
      admin: {
        description: 'Доступний лише адміністраторам. Якщо можна, використовуйте окреме посилання-токен.',
      },
    },
    {
      name: 'supplierBearerToken',
      type: 'text',
      label: 'Токен доступу до прайсу (якщо потрібен)',
      admin: { description: 'Необов’язковий Bearer-токен для захищених посилань.' },
    },
    {
      name: 'lastImportAt',
      type: 'date',
      label: 'Останній імпорт',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastImportStatus',
      type: 'select',
      label: 'Статус останнього запуску',
      options: [
        { label: 'Очікує запуску', value: 'idle' },
        { label: 'Виконується', value: 'running' },
        { label: 'Успішно', value: 'success' },
        { label: 'Помилка', value: 'error' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'lastImportMessage',
      type: 'textarea',
      label: 'Результат останнього запуску',
      admin: { readOnly: true },
    },
    {
      type: 'collapsible',
      label: 'Назви колонок у файлі постачальника',
      admin: {
        description:
          'Вкажіть точні заголовки колонок із першого рядка файлу. Регістр літер не має значення.',
      },
      fields: [
        {
          name: 'skuColumn',
          type: 'text',
          required: true,
          defaultValue: 'sku',
          label: 'Артикул / SKU (обов’язково)',
        },
        {
          name: 'titleColumn',
          type: 'text',
          required: true,
          defaultValue: 'title',
          label: 'Назва товару (обов’язково)',
        },
        {
          name: 'priceColumn',
          type: 'text',
          required: true,
          defaultValue: 'price',
          label: 'Ціна (обов’язково)',
        },
        { name: 'descriptionColumn', type: 'text', defaultValue: 'description', label: 'Опис' },
        { name: 'currencyColumn', type: 'text', label: 'Валюта' },
        { name: 'inventoryColumn', type: 'text', defaultValue: 'stock', label: 'Кількість на складі' },
        { name: 'imageColumn', type: 'text', defaultValue: 'image', label: 'Посилання на фото' },
        { name: 'brandColumn', type: 'text', defaultValue: 'brand', label: 'Бренд' },
        { name: 'gtinColumn', type: 'text', defaultValue: 'gtin', label: 'GTIN / штрихкод' },
        { name: 'mpnColumn', type: 'text', defaultValue: 'mpn', label: 'MPN' },
        { name: 'categoryColumn', type: 'text', defaultValue: 'category', label: 'Категорія' },
      ],
    },
    {
      name: 'delimiter',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Автоматично', value: 'auto' },
        { label: 'Кома', value: ',' },
        { label: 'Крапка з комою', value: ';' },
        { label: 'Табуляція', value: '\t' },
      ],
      admin: {
        description: 'Роздільник для CSV/TSV. Для Excel-файлів це налаштування не потрібне.',
      },
    },
    {
      name: 'encoding',
      type: 'select',
      defaultValue: 'utf-8',
      options: [
        { label: 'UTF-8', value: 'utf-8' },
        { label: 'Windows-1251 (кирилиця)', value: 'windows-1251' },
        { label: 'UTF-16 LE', value: 'utf-16le' },
      ],
      admin: {
        description: 'Кодування CSV/TSV-файлів. Для Excel-файлів це налаштування не потрібне.',
      },
    },
    {
      name: 'publishImportedProducts',
      type: 'checkbox',
      defaultValue: false,
      label: 'Одразу публікувати нові товари',
      admin: {
        description:
          'Якщо вимкнено, нові товари буде створено як чернетки для перевірки. Оновлення не змінює статус наявних товарів.',
      },
    },
  ],
}
