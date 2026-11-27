'use client'

import { Button } from '@/components/ui/button'
import type { Product, Variant } from '@/payload-types'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import clsx from 'clsx'
import { usePathname, useSearchParams } from 'next/navigation'
import React, { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

type Props = {
  product: Product
  quantity?: number
}

const text = {
  uk: {
    added: 'Товар додано до кошика.',
    add: 'Додати в кошик',
  },
  ru: {
    added: 'Товар добавлен в корзину.',
    add: 'Добавить в корзину',
  },
}

// Достаём id из связи. Пустые записи (null) возвращаем как null и не читаем их
const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

export function AddToCart({ product, quantity = 1 }: Props) {
  const { addItem, cart, isLoading } = useCart()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  // Убираем пустые записи (null), чтобы не читать их свойства
  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')
      return variants.find((variant) => idOf(variant) === variantId)
    }
    return undefined
  }, [product.enableVariants, searchParams, variants])

  const addToCart = useCallback(
    (e: React.FormEvent<HTMLButtonElement>) => {
      e.preventDefault()

      // Одним запросом: сразу всё количество
      const addMany = async () => {
        await addItem(
          {
            product: product.id,
            variant: selectedVariant?.id ?? undefined,
          },
          quantity,
        )
      }

      addMany().then(() => {
        toast.success(text[locale].added)

        void fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: String(product.id),
            variantId: selectedVariant ? String(selectedVariant.id) : null,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              console.error('AddToCart server analytics request failed', response.status)
            }
          })
          .catch((error: unknown) => {
            console.error('AddToCart server analytics request failed', error)
          })
      })
    },
    [addItem, product, selectedVariant, locale, quantity],
  )

  const disabled = useMemo<boolean>(() => {
    const existingItem = (cart?.items ?? []).find((item) => {
      const productID = idOf(item.product)
      const variantID = idOf(item.variant)

      if (productID === String(product.id)) {
        if (product.enableVariants) {
          return variantID === (selectedVariant ? String(selectedVariant.id) : null)
        }
        return true
      }
      return false
    })

    if (existingItem) {
      const existingQuantity = existingItem.quantity

      if (product.enableVariants) {
        return existingQuantity >= (selectedVariant?.inventory || 0)
      }
      return existingQuantity >= (product.inventory || 0)
    }

    if (product.enableVariants) {
      if (!selectedVariant) {
        return true
      }

      if (selectedVariant.inventory === 0) {
        return true
      }
    } else {
      if (product.inventory === 0) {
        return true
      }
    }

    return false
  }, [selectedVariant, cart?.items, product])

  return (
    <Button
      aria-label={text[locale].add}
      variant={'outline'}
      className={clsx({
        'hover:opacity-90': true,
      })}
      disabled={disabled || isLoading}
      onClick={addToCart}
      type="submit"
    >
      {text[locale].add}
    </Button>
  )
}