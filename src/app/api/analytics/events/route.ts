import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { sendServerConversion } from '@/utilities/serverAnalytics'

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

  const price = product.priceInUAH ?? product.basePrice ?? product.priceInUSD ?? 0
  const currency =
    product.priceInUAH !== null && product.priceInUAH !== undefined
      ? 'UAH'
      : product.baseCurrency || 'USD'

  await sendServerConversion(
    payload,
    {
      eventId: crypto.randomUUID(),
      name: 'AddToCart',
      value: price,
      currency,
      items: [{ id: String(product.id), quantity: 1, price, title: product.title }],
    },
    req.headers,
  )

  return NextResponse.json({ success: true }, { status: 202 })
}
