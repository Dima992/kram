import type { Order } from '@/payload-types'
import { sendServerConversion } from '@/utilities/serverAnalytics'
import type { CollectionConfig } from 'payload'

// Блок доставки нужен для Новой почты и Укрпочты
const isPostCarrier = (data: { deliveryCarrier?: string | null }) =>
  data.deliveryCarrier === 'nova_poshta' || data.deliveryCarrier === 'ukrposhta'

// Индекс, адрес и отчество нужны только для Укрпочты
const isUkrposhta = (data: { deliveryCarrier?: string | null }) =>
  data.deliveryCarrier === 'ukrposhta'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'customerName', 'phone', 'totalAmount', 'status', 'createdAt'],
  },
  fields: [
    // Боковая колонка: то, что меняют при обработке заказа
    {
      name: 'status',
      type: 'select',
      interfaceName: 'OrderStatus',
      defaultValue: 'new',
      required: true,
      options: [
        { label: 'Новий', value: 'new' },
        { label: 'В обробці', value: 'in_processing' },
        { label: 'Оплачено', value: 'paid' },
        { label: 'Обробляється', value: 'processing' },
        { label: 'Виконано', value: 'completed' },
        { label: 'Скасовано', value: 'cancelled' },
        { label: 'Повернено', value: 'refunded' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'orderType',
      type: 'select',
      defaultValue: 'full',
      options: [
        { label: 'Повне замовлення', value: 'full' },
        { label: 'Швидке (1-клік)', value: 'quick' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Спосіб оплати',
      options: [
        { label: 'LiqPay (Онлайн)', value: 'liqpay' },
        { label: 'IBAN (Розрахунковий рахунок)', value: 'iban' },
        { label: 'Накладений платіж (200 грн предоплата)', value: 'cod' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      label: 'Загальна сума (грн)',
      admin: {
        position: 'sidebar',
      },
    },

    // Контакты клиента
    {
      name: 'surname',
      type: 'text',
      label: 'Прізвище',
    },
    {
      name: 'customerName',
      type: 'text',
      label: "Ім'я клієнта",
    },
    {
      name: 'patronymic',
      type: 'text',
      label: 'По батькові',
      admin: {
        description: 'Для Укрпошти. Може бути порожнім.',
        condition: (data) => isUkrposhta(data) || Boolean(data.patronymic),
      },
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
      admin: {
        components: {
          afterInput: ['@/components/admin/OrderPhoneLinks#OrderPhoneLinks'],
        },
      },
    },

    // Доставка
    {
      name: 'country',
      type: 'text',
      label: 'Країна',
      defaultValue: 'Україна',
    },
    {
      name: 'deliveryCarrier',
      type: 'select',
      label: 'Спосіб доставки',
      options: [
        { label: 'Нова Пошта', value: 'nova_poshta' },
        { label: 'Укрпошта', value: 'ukrposhta' },
        { label: 'Адресна доставка', value: 'address' },
      ],
    },
    {
      name: 'addressDelivery',
      type: 'checkbox',
      label: 'Адресна доставка (відділення не вибрано, адреса в коментарі)',
      admin: {
        condition: (data) => isPostCarrier(data),
      },
    },
    {
      name: 'deliveryDetails',
      type: 'group',
      admin: {
        condition: (data) => isPostCarrier(data),
      },
      fields: [
        { name: 'city', type: 'text', label: 'Місто' },
        {
          name: 'warehouse',
          type: 'text',
          label: 'Відділення / Поштомат',
          admin: {
            condition: (data) => !data.addressDelivery,
          },
        },
        {
          name: 'postcode',
          type: 'text',
          label: 'Індекс (для Укрпошти)',
          admin: {
            condition: (data) => isUkrposhta(data),
          },
        },
        {
          name: 'address',
          type: 'text',
          label: 'Адреса (для Укрпошти)',
          admin: {
            condition: (data) => isUkrposhta(data),
          },
        },
      ],
    },

    // Комментарий клиента
    {
      name: 'comment',
      type: 'textarea',
      label: 'Коментар до замовлення',
      admin: {
        description: 'Побажання клієнта. При адресній доставці тут адреса. Може бути порожнім.',
      },
    },
  ],

  // ХУК: Срабатывает ПОСЛЕ любого изменения заказа в админке
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // Проверяем: статус изменился с 'new' (Новий) на 'in_processing' (В обробці) или 'paid' (Оплачено)
        const isConfirmedNow =
          previousDoc?.status === 'new' &&
          (doc?.status === 'in_processing' || doc?.status === 'paid')

        if (isConfirmedNow) {
          console.log(`[Order Confirmed] Заказ #${doc.id} подтвержден менеджером!`)

          const items =
            (doc.items as Order['items'])?.flatMap((item) => {
              const productID =
                typeof item.product === 'object' && item.product
                  ? item.product.id
                  : item.product

              return typeof productID === 'string'
                ? [{ id: productID, quantity: item.quantity }]
                : []
            }) || []

          await sendServerConversion(
            req.payload,
            {
              eventId: `purchase_${doc.id}`,
              name: 'Purchase',
              orderId: String(doc.id),
              value: doc.totalAmount ?? doc.amount ?? 0,
              currency: 'UAH',
              email: doc.customerEmail,
              phone: doc.phone || doc.shippingAddress?.phone,
              items,
            },
            req.headers,
          )
        }
      },
    ],
  },
}