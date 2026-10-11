import configPromise from '@payload-config'
import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const formData = await req.formData()
  const data = formData.get('data')
  const signature = formData.get('signature')

  if (typeof data !== 'string' || typeof signature !== 'string') {
    return NextResponse.json({ error: 'Invalid LiqPay callback' }, { status: 400 })
  }

  const { liqpayPrivateKey, liqpayPublicKey } = await payload.findGlobal({
    slug: 'site-settings',
    overrideAccess: true,
  })

  if (!liqpayPrivateKey) {
    payload.logger.warn('LiqPay callback rejected: private key is not configured')
    return NextResponse.json({ error: 'LiqPay is not configured' }, { status: 503 })
  }

  const expectedSignature = createHash('sha1')
    .update(`${liqpayPrivateKey}${data}${liqpayPrivateKey}`)
    .digest('base64')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    payload.logger.warn('LiqPay callback rejected: signature mismatch')
    return NextResponse.json({ error: 'Invalid LiqPay signature' }, { status: 400 })
  }

  let payment: {
    order_id?: unknown
    status?: unknown
    amount?: unknown
    currency?: unknown
    public_key?: unknown
  }

  try {
    payment = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
  } catch (error) {
    payload.logger.error({ err: error }, 'Could not parse LiqPay callback data')
    return NextResponse.json({ error: 'Invalid LiqPay data' }, { status: 400 })
  }

  if (
    typeof payment.order_id !== 'string' ||
    typeof payment.status !== 'string' ||
    payment.status !== 'success'
  ) {
    return NextResponse.json({ success: true })
  }
  if (!liqpayPublicKey || payment.public_key !== liqpayPublicKey) {
    payload.logger.warn('LiqPay callback rejected: public key mismatch')
    return NextResponse.json({ error: 'Invalid LiqPay merchant' }, { status: 400 })
  }

  const order = await payload.findByID({
    collection: 'orders',
    id: payment.order_id,
    overrideAccess: true,
  })

  const amount =
    typeof payment.amount === 'number' || typeof payment.amount === 'string'
      ? Number(payment.amount)
      : Number.NaN

  if (payment.currency !== 'UAH' || !Number.isFinite(amount) || amount !== order.totalAmount) {
    payload.logger.warn({ orderID: order.id }, 'LiqPay callback amount or currency mismatch')
    return NextResponse.json({ error: 'Payment does not match order' }, { status: 400 })
  }

  if (order.status !== 'paid') {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'paid' },
      overrideAccess: true,
    })
  }

  return NextResponse.json({ success: true })
}
