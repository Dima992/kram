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
    // bg-foreground и text-background берутся из темы: полоса всегда контрастна фону страницы
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/10 bg-foreground text-background shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
      <div className="container flex items-center gap-4 py-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-background/20"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.title}</p>
          <p className="mt-0.5 text-base font-bold">
            {product.priceInUAH?.toLocaleString('uk-UA')} грн
          </p>
        </div>

        <div className="w-40 shrink-0 sm:w-56 [&_button]:w-full [&_button]:border-[#0b7a78] [&_button]:bg-[#0b7a78] [&_button]:text-white [&_button:hover]:bg-[#096664]">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  )
}