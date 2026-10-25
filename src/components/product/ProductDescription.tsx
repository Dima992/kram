'use client'
import type { Product, Variant } from '@/payload-types'

import { AddToCart } from '@/components/Cart/AddToCart'
import { Price } from '@/components/Price'
import { RichText } from '@/components/RichText'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { StockIndicator } from '@/components/product/StockIndicator'
import { VariantSelector } from './VariantSelector'

const getVariantPrice = (variant: Variant, product: Product): number | null => {
  if (typeof variant.priceInUAH === 'number' && variant.priceInUAH > 0) return variant.priceInUAH
  if (typeof product.priceInUAH === 'number' && product.priceInUAH > 0) return product.priceInUAH
  return null
}

function ProductPrice({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )
  const hasVariants = Boolean(product.enableVariants && variants.length > 0)
  const selectedVariantID = searchParams.get('variant')

  if (hasVariants && selectedVariantID) {
    const selectedVariant = variants.find((variant) => String(variant.id) === selectedVariantID)
    const amount = selectedVariant ? getVariantPrice(selectedVariant, product) : null
    return amount !== null ? <Price amount={amount} /> : null
  }

  if (hasVariants) {
    const prices = variants
      .map((variant) => getVariantPrice(variant, product))
      .filter((price): price is number => price !== null)
    if (prices.length === 0) return null
    const lowest = Math.min(...prices)
    const hasDifferentPrices = new Set(prices).size > 1
    return (
      <>
        {hasDifferentPrices && <span className="mr-2 normal-case">від</span>}
        <Price amount={lowest} />
      </>
    )
  }

  const amount =
    typeof product.priceInUAH === 'number' && product.priceInUAH > 0 ? product.priceInUAH : null
  return amount !== null ? <Price amount={amount} /> : null
}

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex h-10 items-center rounded-md border">
      <button
        type="button"
        className="h-full w-10 disabled:opacity-40"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        aria-label="Меньше"
      >
        −
      </button>
      <span className="w-10 text-center">{quantity}</span>
      <button
        type="button"
        className="h-full w-10 disabled:opacity-40"
        onClick={() => onChange(Math.min(10, quantity + 1))}
        disabled={quantity >= 10}
        aria-label="Больше"
      >
        +
      </button>
    </div>
  )
}

export function ProductDescription({ product }: { product: Product }) {
  const hasVariants = Boolean(product.enableVariants && product.variants?.docs?.length)
  const [quantity, setQuantity] = useState(1)

  return (
    <>
      {/* Название и цена: на телефоне первыми */}
      <div className="order-1 flex flex-col gap-2 lg:order-none lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-medium">{product.title}</h1>
        <div className="font-mono uppercase">
          <Suspense fallback={null}>
            <ProductPrice product={product} />
          </Suspense>
        </div>
      </div>

      {/* Варианты, наличие, количество и кнопка: после фото */}
      <div className="order-3 flex flex-col gap-6 lg:order-none">
        {hasVariants && (
          <>
            <Suspense fallback={null}>
              <VariantSelector product={product} />
            </Suspense>
            <hr />
          </>
        )}
        <div className="flex items-center justify-between">
          <Suspense fallback={null}>
            <StockIndicator product={product} />
          </Suspense>
        </div>
        <div id="buy-block" className="flex items-center gap-3">
          <QuantityControl quantity={quantity} onChange={setQuantity} />
          <div className="min-w-0 flex-1">
            <Suspense fallback={null}>
              <AddToCart product={product} quantity={quantity} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Описание: в самом низу */}
      {product.description ? (
        <div className="order-4 lg:order-none">
          <RichText className="" data={product.description} enableGutter={false} />
        </div>
      ) : null}
    </>
  )
}