'use client'

import React, { useEffect, useState } from 'react'

type ProductInfo = {
  title?: string
  slug?: string
  gallery?: { image?: { url?: string } | string }[]
}

type Props = {
  data?: any
  rowNumber?: number
}

// Строка позиции заказа в админке: фото, название и ссылка на товар.
export const OrderItemRowLabel: React.FC<Props> = ({ data, rowNumber }) => {
  const productRef = data?.product
  const populated: ProductInfo | null =
    typeof productRef === 'object' && productRef ? productRef : null
  const productID: string | undefined =
    typeof productRef === 'object' && productRef ? productRef.id : productRef

  const [loaded, setLoaded] = useState<ProductInfo | null>(null)

  useEffect(() => {
    // Если товар уже пришёл из базы целиком, ничего не запрашиваем
    if (!productID || populated?.title) return

    let cancelled = false
    fetch(`/api/products/${productID}?depth=2&locale=uk`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        if (!cancelled && doc) setLoaded(doc)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [productID, populated?.title])

  const product = populated?.title ? populated : loaded
  const fallback = `Товар ${(rowNumber ?? 0) + 1}`

  const firstImage = product?.gallery?.[0]?.image
  const imageURL =
    typeof firstImage === 'object' && firstImage?.url ? firstImage.url : null

  if (!product?.title) {
    return <span>{fallback}</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {imageURL && (
        <img
          alt=""
          height={48}
          src={imageURL}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          width={48}
        />
      )}
      {product.slug ? (
        <a href={`/products/${product.slug}`} rel="noopener noreferrer" target="_blank">
          {product.title}
        </a>
      ) : (
        <span>{product.title}</span>
      )}
    </div>
  )
}