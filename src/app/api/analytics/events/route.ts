import { sendServerConversion } from '@/utilities/serverAnalytics'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('productId' in body) ||
    typeof body.productId !== 'string' ||
    !body.productId.trim()
  ) {
    return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  let product
  try {
    product = await payload.findByID({
      collection: 'products',
      id: body.productId,
      depth: 0,
      overrideAccess: true,
    })
  } catch (error) {
    payload.logger.warn({ err: error, productID: body.productId }, 'AddToCart conversion skipped: product not found')
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
  }

  if (product._status !== 'published') {
    return NextResponse.json({ success: false, error: 'Product is not available' }, { status: 404 })
  }

  const price = product.priceInUAH
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ success: false, error: 'Price is not available' }, { status: 422 })
  }

  await sendServerConversion(
    payload,
    {
      eventId: crypto.randomUUID(),
      name: 'AddToCart',
      value: price,
      currency: 'UAH',
      items: [{ id: String(product.id), quantity: 1, price, title: product.title }],
    },
    req.headers,
  )

  return NextResponse.json({ success: true }, { status: 202 })
}