import configPromise from '@payload-config'
import { authenticateApiKey } from '@/utilities/apiKeys'
import { validateOrderWrite } from '@/utilities/externalApi'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

function paginationValue(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export async function GET(req: Request) {
  const payload = await getPayload({ config: configPromise })
  if (!(await authenticateApiKey(payload, req.headers, 'orders:read'))) {
    return NextResponse.json({ error: 'Недійсний ключ або недостатньо прав.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const page = paginationValue(url.searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER)
  const limit = paginationValue(url.searchParams.get('limit'), 50, 100)
  const result = await payload.find({
    collection: 'orders',
    depth: 0,
    limit,
    page,
    overrideAccess: true,
    sort: '-createdAt',
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      orderType: true,
      customerName: true,
      customerEmail: true,
      phone: true,
      deliveryCarrier: true,
      deliveryDetails: true,
      paymentMethod: true,
      totalAmount: true,
      amount: true,
      currency: true,
      items: true,
    },
  })

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
    },
  })
}

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  if (!(await authenticateApiKey(payload, req.headers, 'orders:write'))) {
    return NextResponse.json({ error: 'Недійсний ключ або недостатньо прав.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некоректний JSON.' }, { status: 400 })
  }

  const data = validateOrderWrite(body)
  if (!data) return NextResponse.json({ error: 'Перевірте поля замовлення.' }, { status: 400 })

  const productIDs = [...new Set((data.items || []).map((item) => String(item.product)))]
  if (productIDs.length) {
    const products = await payload.find({
      collection: 'products',
      depth: 0,
      limit: productIDs.length,
      overrideAccess: true,
      where: { id: { in: productIDs } },
    })
    if (products.docs.length !== productIDs.length) {
      return NextResponse.json({ error: 'Одного або кількох товарів не знайдено.' }, { status: 400 })
    }
  }

  const order = await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      ...data,
      status: data.status || 'new',
    },
  })
  return NextResponse.json({ doc: order }, { status: 201 })
}
