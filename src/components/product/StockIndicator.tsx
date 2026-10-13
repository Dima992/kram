'use client'
import { Product, Variant } from '@/payload-types'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

type Props = {
  product: Product
}

const text = {
  uk: {
    inStock: 'В наявності',
    outOfStock: 'Немає в наявності',
  },
  ru: {
    inStock: 'В наличии',
    outOfStock: 'Нет в наличии',
  },
}

export const StockIndicator: React.FC<Props> = ({ product }) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  const variants = product.variants?.docs || []

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')
      const validVariant = variants.find((variant) => {
        if (typeof variant === 'object') {
          return String(variant.id) === variantId
        }
        return String(variant) === variantId
      })

      if (validVariant && typeof validVariant === 'object') {
        return validVariant
      }
    }

    return undefined
  }, [product.enableVariants, searchParams, variants])

  const isInStock = useMemo(() => {
    if (product.enableVariants) {
      return Boolean(selectedVariant && (selectedVariant.inventory ?? 0) > 0)
    }
    return (product.inventory ?? 0) > 0
  }, [product.enableVariants, selectedVariant, product.inventory])

  if (product.enableVariants && !selectedVariant) {
    return null
  }

  return (
    <div className="uppercase font-mono text-sm font-medium text-gray-500">
      <p>{isInStock ? text[locale].inStock : text[locale].outOfStock}</p>
    </div>
  )
}
