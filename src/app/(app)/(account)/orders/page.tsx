import type { Order } from '@/payload-types'
import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import { OrderItem } from '@/components/OrderItem'
import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export default async function Orders() {
  const headers = await getHeaders()
  const locale = headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const text = {
    uk: {
      loginRequired: 'Будь ласка, увійдіть, щоб мати доступ до ваших замовлень.',
      heading: 'Замовлення',
      empty: 'У вас немає замовлень.',
      metaDescription: 'Ваші замовлення.',
      metaTitle: 'Замовлення',
    },
    ru: {
      loginRequired: 'Пожалуйста, войдите, чтобы получить доступ к вашим заказам.',
      heading: 'Заказы',
      empty: 'У вас нет заказов.',
      metaDescription: 'Ваши заказы.',
      metaTitle: 'Заказы',
    },
  }[locale]

  let orders: Order[] | null = null

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent(text.loginRequired)}`)
  }

  try {
    const ordersResult = await payload.find({
      collection: 'orders',
      limit: 0,
      pagination: false,
      user,
      overrideAccess: false,
      where: {
        customer: {
          equals: user?.id,
        },
      },
    })

    orders = ordersResult?.docs || []
  } catch (error) {}

  return (
    <>
      <div className="border p-8 rounded-lg bg-primary-foreground w-full">
        <h1 className="text-3xl font-medium mb-8">{text.heading}</h1>
        {(!orders || !Array.isArray(orders) || orders?.length === 0) && (
          <p className="">{text.empty}</p>
        )}

        {orders && orders.length > 0 && (
          <ul className="flex flex-col gap-6">
            {orders?.map((order, index) => (
              <li key={order.id}>
                <OrderItem order={order} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export const metadata: Metadata = {
  description: 'Ваші замовлення.',
  openGraph: mergeOpenGraph({
    title: 'Замовлення',
    url: '/orders',
  }),
  title: 'Замовлення',
}
