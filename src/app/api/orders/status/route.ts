import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

// Отдаёт только статус оплаты заказа. Данные покупателя не возвращаем.
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  try {
    await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
    })

    const { docs: transactions } = await payload.find({
      collection: 'transactions',
      where: { order: { equals: orderId } },
      limit: 5,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    const paid = transactions.some((transaction) => transaction.status === 'succeeded')

    return NextResponse.json({ paid })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}