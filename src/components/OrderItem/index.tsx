import { OrderStatus } from '@/components/OrderStatus'
import { Price } from '@/components/Price'
import { Button } from '@/components/ui/button'
import { Order } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'
import Link from 'next/link'

type Props = {
  order: Order
  locale?: 'uk' | 'ru'
}

export const OrderItem: React.FC<Props> = ({ order, locale = 'uk' }) => {
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const text = {
    uk: {
      item: 'товар',
      items: 'товарів',
      viewOrder: 'Переглянути замовлення',
    },
    ru: {
      item: 'товар',
      items: 'товаров',
      viewOrder: 'Посмотреть заказ',
    },
  }[locale]

  const itemsLabel = order.items?.length === 1 ? text.item : text.items
  const totalAmount = typeof order.totalAmount === 'number' && order.totalAmount > 0 ? order.totalAmount : null

  return (
    <div className="bg-card border rounded-lg px-4 py-2 md:px-6 md:py-4 flex flex-col sm:flex-row gap-12 sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm uppercase font-mono tracking-widest text-primary/50 truncate max-w-32 sm:max-w-none">{`#${order.id}`}</h3>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-6">
          <p className="text-xl">
            <time dateTime={order.createdAt}>
              {formatDateTime({
                date: order.createdAt,
                format: 'MMMM dd, yyyy',
                locale,
              })}
            </time>
          </p>

          {order.status && <OrderStatus status={order.status} />}
        </div>

        <p className="flex gap-2 text-xs text-primary/80">
          <span>
            {order.items?.length} {itemsLabel}
          </span>
          {totalAmount !== null && (
            <>
              <span>•</span>
              <Price as="span" amount={totalAmount} />
            </>
          )}
        </p>
      </div>

      <Button variant="outline" asChild className="self-start sm:self-auto">
        <Link href={`${localePrefix}/orders/${order.id}`}>{text.viewOrder}</Link>
      </Button>
    </div>
  )
}
