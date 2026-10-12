import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers.js'
import configPromise from '@payload-config'
import { AccountForm } from '@/components/forms/AccountForm'
import { Order } from '@/payload-types'
import { OrderItem } from '@/components/OrderItem'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export default async function AccountPage() {
  const headers = await getHeaders()
  const locale = headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const text = {
    uk: {
      loginRequired: 'Будь ласка, увійдіть, щоб отримати доступ до налаштувань акаунта.',
      heading: 'Налаштування акаунта',
      recentOrders: 'Останні замовлення',
      description:
        'Ось найновіші замовлення, які ви зробили. Кожне замовлення пов’язане з оплатою. З часом вони з’являться у списку замовлень.',
      noOrders: 'У вас немає замовлень.',
      viewAllOrders: 'Переглянути всі замовлення',
    },
    ru: {
      loginRequired: 'Пожалуйста, войдите, чтобы получить доступ к настройкам аккаунта.',
      heading: 'Настройки аккаунта',
      recentOrders: 'Недавние заказы',
      description:
        'Это ваши последние заказы. Каждый заказ связан с оплатой. По мере оформления новых заказов они будут появляться в списке.',
      noOrders: 'У вас нет заказов.',
      viewAllOrders: 'Посмотреть все заказы',
    },
  }[locale]

  let orders: Order[] | null = null

  if (!user) {
    redirect(`/login?warning=${encodeURIComponent(text.loginRequired)}`)
  }

  try {
    const ordersResult = await payload.find({
      collection: 'orders',
      limit: 5,
      user,
      overrideAccess: false,
      pagination: false,
      where: {
        customer: {
          equals: user?.id,
        },
      },
    })

    orders = ordersResult?.docs || []
  } catch (error) {
    // when deploying this template on Payload Cloud, this page needs to build before the APIs are live
    // so swallow the error here and simply render the page with fallback data where necessary
    // in production you may want to redirect to a 404  page or at least log the error somewhere
    // console.error(error)
  }

  return (
    <>
      <div className="border p-8 rounded-lg bg-primary-foreground">
        <h1 className="text-3xl font-medium mb-8">{text.heading}</h1>
        <AccountForm />
      </div>

      <div className=" border p-8 rounded-lg bg-primary-foreground">
        <h2 className="text-3xl font-medium mb-8">{text.recentOrders}</h2>

        <div className="prose dark:prose-invert mb-8">
          <p>{text.description}</p>
        </div>

        {(!orders || !Array.isArray(orders) || orders?.length === 0) && (
          <p className="mb-8">{text.noOrders}</p>
        )}

        {orders && orders.length > 0 && (
          <ul className="flex flex-col gap-6 mb-8">
            {orders?.map((order, index) => (
              <li key={order.id}>
                <OrderItem order={order} />
              </li>
            ))}
          </ul>
        )}

        <Button asChild variant="default">
          <Link href="/orders">{text.viewAllOrders}</Link>
        </Button>
      </div>
    </>
  )
}

export const metadata: Metadata = {
  description: 'Створіть обліковий запис або увійдіть у свій.',
  openGraph: mergeOpenGraph({
    title: 'Акаунт',
    url: '/account',
  }),
  title: 'Акаунт',
}
