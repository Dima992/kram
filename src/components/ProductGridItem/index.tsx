import type { Product } from '@/payload-types'

import { Media } from '@/components/Media'
import { Price } from '@/components/Price'
import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'

type Props = {
  locale?: 'uk' | 'ru'
  product: Partial<Product>
  priority?: boolean
}

export const ProductGridItem: React.FC<Props> = ({ locale, priority = false, product }) => {
  const { gallery, priceInUAH, title } = product

  // Цена только в гривнах. Без запасных вариантов в USD или базовой цене.
  const price = priceInUAH

  const image =
    gallery?.[0]?.image && typeof gallery[0]?.image !== 'string' ? gallery[0]?.image : false

  const productHref = `${locale === 'ru' ? '/ru' : ''}/products/${product.slug}`

  return (
    <Link className="relative inline-block h-full w-full group" href={productHref}>
      {image ? (
        <div className="relative aspect-square overflow-hidden rounded-2xl border bg-primary-foreground p-8">
          <Media
            fill
            htmlElement={null}
            imgClassName={clsx('rounded-2xl object-cover', {
              'transition duration-300 ease-in-out group-hover:scale-102': true,
            })}
            priority={priority}
            resource={image}
            size="(min-width: 1280px) 426px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, calc(100vw - 2rem)"
          />
        </div>
      ) : null}

      <div className="font-mono text-primary/50 group-hover:text-primary flex justify-between items-center mt-4">
        <div>{title}</div>

        {typeof price === 'number' && (
          <div className="">
            <Price amount={price} />
          </div>
        )}
      </div>
    </Link>
  )
}
