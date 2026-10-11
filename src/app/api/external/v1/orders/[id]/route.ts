import configPromise from '@payload-config'
import { authenticateApiKey } from '@/utilities/apiKeys'
import type { Order } from '@/payload-types'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { validateOrderWrite } from '@/utilities/externalApi'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (data.items) {
    const productIDs = [...new Set(data.items.map((item) => String(item.product)))]
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

  const { id } = await params
  const existing = await payload.findByID({
    collection: 'orders',
    id,
    overrideAccess: true,
  })
  if (!existing) return NextResponse.json({ error: 'Замовлення не знайдено.' }, { status: 404 })

  const updated = await payload.update({
    collection: 'orders',
    id,
    overrideAccess: true,
    data: data as Partial<Order>,
  })
  return NextResponse.json({ doc: updated })
}
