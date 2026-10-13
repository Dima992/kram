import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import type { Metadata } from 'next'
import { UACheckoutPage } from './UACheckoutPage'

export default function Checkout() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col justify-between">
      <h1 className="sr-only">Оформлення замовлення</h1>
      <UACheckoutPage />
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
