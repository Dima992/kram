'use client'

import { AddToCart } from '@/components/Cart/AddToCart'
import type { Media, Product } from '@/payload-types'
import { useEffect, useState } from 'react'

type Props = {
  product: Product
}

export function StickyBuyBar({ product }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const target = document.getElementById('buy-block')
    if (!target) return

    // Браузер сам сообщает, когда основная кнопка уходит за верх экрана.
    // Панель показываем только в этом случае. Расчёты на каждом скролле не нужны.
    const observer = new IntersectionObserver(([entry]) => {
      setShow(!entry.isIntersecting && entry.boundingClientRect.bottom < 0)
    })
    observer.observe(target)

    return () => observer.disconnect()
  }, [])

  const image = product.gallery?.[0]?.image
  const imageUrl = typeof image === 'object' && image ? (image as Media).url : undefined

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-3 text-foreground shadow-lg">
      <div className="container flex items-center gap-3">
        {imageUrl && <img src={imageUrl} alt="" className="h-12 w-12 rounded object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{product.title}</p>
          <p className="text-sm text-foreground">{product.priceInUAH} грн</p>
        </div>
        <div className="min-w-0 flex-1 [&_button]:w-full [&_button]:border-[#0b7a78] [&_button]:bg-[#0b7a78] [&_button]:text-white [&_button:hover]:opacity-90">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  )
}