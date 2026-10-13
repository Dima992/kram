import type { Media, Product, ThreeItemGridBlock as ThreeItemGridBlockProps } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import Link from 'next/link'
import type { DefaultDocumentIDType } from 'payload'
import React from 'react'

type Props = { item: Product; priority?: boolean; size: 'full' | 'half' }

export const ThreeItemGridItem: React.FC<Props> = ({ item, priority = false, size }) => {
  return (
    <div
      className={size === 'full' ? 'md:col-span-4 md:row-span-2' : 'md:col-span-2 md:row-span-1'}
    >
      <Link className="relative block aspect-square h-full w-full" href={`/products/${item.slug}`}>
        <GridTileImage
          label={{
            amount: item.priceInUAH as number,
            position: size === 'full' ? 'center' : 'bottom',
            title: item.title,
          }}
          media={item.meta?.image as Media}
          priority={priority}
          sizes={
            size === 'full'
              ? '(min-width: 768px) 66vw, 100vw'
              : '(min-width: 768px) 33vw, 100vw'
          }
        />
      </Link>
    </div>
  )
}

export const ThreeItemGridBlock: React.FC<
  ThreeItemGridBlockProps & {
    id?: DefaultDocumentIDType
    className?: string
  }
> = async ({ products }) => {
  if (!products || !products[0] || !products[1] || !products[2]) return null

  const [firstProduct, secondProduct, thirdProduct] = products as Product[]
  const threeProducts = [firstProduct, secondProduct, thirdProduct]

  const allPriced = threeProducts.every(
    (item) => typeof item.priceInUAH === 'number' && item.priceInUAH > 0,
  )
  if (!allPriced) return null

  return (
    <section className="container grid gap-4 pb-4 md:grid-cols-6 md:grid-rows-2">
      <ThreeItemGridItem item={firstProduct} priority size="full" />
      <ThreeItemGridItem item={secondProduct} size="half" />
      <ThreeItemGridItem item={thirdProduct} size="half" />
    </section>
  )
}
