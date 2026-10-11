import type { CollectionConfig } from 'payload'
import type { Order } from '@/payload-types'
import { sendServerConversion } from '@/utilities/serverAnalytics'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'customerName', 'phone', 'totalAmount', 'status', 'createdAt'],
  },
  fields: [
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
      name: 'customerName',
      type: 'text',
      label: "Ім'я клієнта",
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
    },
    {
      name: 'deliveryCarrier',
      type: 'select',
      options: [
        { label: 'Нова Пошта', value: 'nova_poshta' },
        { label: 'Укрпошта', value: 'ukrposhta' },
      ],
      label: 'Перевізник',
    },
    {
      name: 'deliveryDetails',
      type: 'group',
      fields: [
        { name: 'city', type: 'text', label: 'Місто' },
        { name: 'warehouse', type: 'text', label: 'Відділення / Поштомат' },
        { name: 'postcode', type: 'text', label: 'Індекс (для Укрпошти)' },
        { name: 'address', type: 'text', label: 'Адреса (для Укрпошти)' },
      ],
    },
    {
      name: 'paymentMethod',
      type: 'select',
      options: [
        { label: 'LiqPay (Онлайн)', value: 'liqpay' },
        { label: 'IBAN (Розрахунковий рахунок)', value: 'iban' },
        { label: 'Накладений платіж (200 грн предоплата)', value: 'cod' },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      label: 'Загальна сума (грн)',
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
