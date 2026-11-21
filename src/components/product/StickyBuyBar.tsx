'use client'

import { AddToCart } from '@/components/Cart/AddToCart'
import type { Media, Product, Variant } from '@/payload-types'
import { priceOfProduct, priceOfVariant } from '@/utilities/displayPrice'
import { formatSaleEnd } from '@/utilities/sale'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

type Props = {
  product: Product
}

const formatPrice = (amount: number) => `${amount.toLocaleString('uk-UA')} грн`

// Цена внизу: та же, что на странице (выбранный вариант или товар)
function BarPrice({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )
  const selected = product.enableVariants
    ? variants.find((variant) => String(variant.id) === searchParams.get('variant'))
    : undefined

  const price = selected ? priceOfVariant(selected, product) : priceOfProduct(product)
  if (!price) return null

  const endText = price.sale ? formatSaleEnd(price.sale.endsAt, locale) : null

  return (
    <>
      {price.sale && (
        <s className="mr-2 text-sm font-normal opacity-60">{formatPrice(price.sale.oldPrice)}</s>
      )}
      {formatPrice(price.amount)}
      {price.sale && (
        <span className="ml-2 rounded bg-[#0b7a78] px-1.5 py-0.5 align-middle text-xs font-medium text-white">
          -{price.sale.percent}%
        </span>
      )}
      {endText && (
        <span className="mt-0.5 block text-xs font-normal opacity-70">{endText}</span>
      )}
    </>
  )
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
            <Suspense fallback={null}>
              <BarPrice product={product} />
            </Suspense>
          </p>
        </div>

        <div className="w-40 shrink-0 sm:w-56 [&_button]:w-full [&_button]:border-[#0b7a78] [&_button]:bg-[#0b7a78] [&_button]:text-white [&_button:hover]:bg-[#096664]">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  )
}