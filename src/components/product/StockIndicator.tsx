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
    backorder: 'Під замовлення',
  },
  ru: {
    inStock: 'В наличии',
    outOfStock: 'Нет в наличии',
    backorder: 'Под заказ',
  },
}

// Правильная форма слова «день» по числу
function daysWord(count: number, locale: 'uk' | 'ru'): string {
  const lastTwo = count % 100
  const last = count % 10

  if (locale === 'uk') {
    if (last === 1 && lastTwo !== 11) return 'день'
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'дні'
    return 'днів'
  }

  if (last === 1 && lastTwo !== 11) return 'день'
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'дня'
  return 'дней'
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

  const label = useMemo<string | null>(() => {
    const t = text[locale]
    const status = product.stockStatus ?? 'inStock'

    // Под заказ: срок показываем, если он заполнен
    if (status === 'backorder') {
      const days = product.backorderDays
      return typeof days === 'number' && days > 0
        ? `${t.backorder} · ${days} ${daysWord(days, locale)}`
        : t.backorder
    }

    if (product.enableVariants) {
      // Вариант не выбран: показываем только «Немає», если товар так помечен
      if (!selectedVariant) {
        return status === 'outOfStock' ? t.outOfStock : null
      }
      // Вариант выбран: решает его остаток (0 = нет в наличии)
      return (selectedVariant.inventory ?? 0) > 0 ? t.inStock : t.outOfStock
    }

    // Товар без вариантов: решает статус товара
    return status === 'outOfStock' ? t.outOfStock : t.inStock
  }, [locale, product.stockStatus, product.backorderDays, product.enableVariants, selectedVariant])

  if (!label) return null

  return (
    <div className="uppercase font-mono text-sm font-medium text-gray-500">
      <p>{label}</p>
    </div>
  )
}