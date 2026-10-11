import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import type { Metadata } from 'next'
import { UACheckoutPage } from './UACheckoutPage'

export default async function Checkout() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })
  const products = docs.flatMap((product) =>
    typeof product.priceInUAH === 'number' && product.priceInUAH > 0
      ? [{ id: String(product.id), title: product.title, price: product.priceInUAH }]
      : [],
  )

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col justify-between">
      <h1 className="sr-only">Оформлення замовлення</h1>
      <UACheckoutPage products={products} />
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Оформлення замовлення.',
  openGraph: mergeOpenGraph({
    title: 'Оформлення замовлення',
    url: '/checkout',
  }),
  title: 'Оформлення замовлення',
}