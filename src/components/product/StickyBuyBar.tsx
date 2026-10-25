'use client'

import { AddToCart } from '@/components/Cart/AddToCart'
import type { Media, Product } from '@/payload-types'
import { useEffect, useRef, useState } from 'react'

type Props = {
  product: Product
}

export function StickyBuyBar({ product }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const update = () => {
      const el = sentinelRef.current
      if (el) setShow(el.getBoundingClientRect().top < 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const image = product.gallery?.[0]?.image
  const imageUrl = typeof image === 'object' && image ? (image as Media).url : undefined

  return (
    <>
      <div ref={sentinelRef} />
      {show && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-3 shadow-lg">
          <div className="container flex items-center gap-3">
            {imageUrl && <img src={imageUrl} alt="" className="h-12 w-12 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{product.title}</p>
              <p className="text-sm text-foreground">{product.priceInUAH} грн</p>
            </div>
            <AddToCart product={product} />
          </div>
        </div>
      )}
    </>
  )
}