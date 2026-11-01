'use client'

import type { Product } from '@/payload-types'

import { createUrl } from '@/utilities/createUrl'
import clsx from 'clsx'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type MediaLike = { url?: string | null; alt?: string | null }
type PhotoSettings = Record<string, { isVariant?: boolean; photos?: boolean }>

// Достаёт id из связи: бывает либо сам id, либо объект с id
const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

// Фото для значения: первое фото галереи, привязанное к этому значению
const photoForOption = (product: Product, optionID: string): MediaLike | null => {
  const item = (product.gallery ?? []).find(
    (g) => g && idOf(g.variantOption) === optionID && typeof g.image === 'object' && g.image,
  )
  if (!item || typeof item.image !== 'object' || !item.image) return null
  const media = item.image as MediaLike
  return media.url ? media : null
}

// Красный крест поверх кнопки, если вариант нет в наличии
const OutOfStockCross = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 h-full w-full"
    preserveAspectRatio="none"
    viewBox="0 0 100 100"
  >
    <line
      x1="0"
      y1="0"
      x2="100"
      y2="100"
      stroke="#dc2626"
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
    <line
      x1="100"
      y1="0"
      x2="0"
      y2="100"
      stroke="#dc2626"
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)

export function VariantSelector({ product }: { product: Product }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const variants = product.variants?.docs
  const variantTypes = product.variantTypes
  const hasVariants = Boolean(product.enableVariants && variants?.length && variantTypes?.length)

  if (!hasVariants) {
    return null
  }

  // Настройки «Фото потрібні» по характеристикам (ключ: id характеристики)
  const settings =
    (product as unknown as { variantSettings?: PhotoSettings | null }).variantSettings ?? {}

  return (
    <>
      {variantTypes?.map((type) => {
        if (!type || typeof type !== 'object') return null

        const options = type.options?.docs
        if (!options || !Array.isArray(options) || !options.length) return null

        // Имя типа = char-<id характеристики>: по нему находим настройку фото
        const charId = type.name?.startsWith('char-') ? type.name.slice(5) : ''
        const withPhotos = Boolean(settings[charId]?.photos)

        return (
          <dl key={type.id}>
            <dt className="mb-3 text-sm font-medium text-neutral-900">{type.label}</dt>
            <dd className="flex flex-wrap gap-2">
              {options.map((option) => {
                if (!option || typeof option !== 'object') return null

                const optionID = String(option.id)
                const label = option.label ?? ''

                // Берём текущие параметры из адреса, чтобы не потерять другие выборы
                const optionSearchParams = new URLSearchParams(searchParams.toString())
                optionSearchParams.delete('variant')
                optionSearchParams.delete('image')
                optionSearchParams.set(type.name, optionID)

                const currentOptions = Array.from(optionSearchParams.values())

                let isAvailableForSale = true

                // Ищем подходящий вариант
                const matchingVariant = variants
                  ?.filter((variant) => typeof variant === 'object')
                  .find((variant) => {
                    if (!variant.options || !Array.isArray(variant.options)) return false
                    return variant.options.every((variantOption) => {
                      if (typeof variantOption !== 'object')
                        return currentOptions.includes(String(variantOption))
                      return currentOptions.includes(String(variantOption.id))
                    })
                  })

                if (matchingVariant) {
                  optionSearchParams.set('variant', String(matchingVariant.id))
                  isAvailableForSale = Boolean(
                    matchingVariant.inventory && matchingVariant.inventory > 0,
                  )
                }

                const optionUrl = createUrl(pathname, optionSearchParams)
                const isActive =
                  isAvailableForSale && searchParams.get(type.name) === optionID

                const onSelect = () => {
                  router.replace(`${optionUrl}`, { scroll: false })
                }

                const photo = withPhotos ? photoForOption(product, optionID) : null

                // Значение с фото: миниатюра и подпись под ней
                if (photo?.url) {
                  return (
                    <button
                      type="button"
                      key={optionID}
                      aria-pressed={isActive}
                      disabled={!isAvailableForSale}
                      title={isAvailableForSale ? label : `${label} — немає в наявності`}
                      onClick={onSelect}
                      className={clsx('flex w-16 flex-col items-center gap-1 text-xs', {
                        'cursor-not-allowed': !isAvailableForSale,
                      })}
                    >
                      <span
                        className={clsx(
                          'relative block size-16 overflow-hidden rounded-md border-2 transition-colors',
                          {
                            'border-[#0b7a78]': isActive,
                            'border-neutral-300 hover:border-[#0b7a78]':
                              isAvailableForSale && !isActive,
                            'border-neutral-200': !isAvailableForSale,
                          },
                        )}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.alt || label}
                          fill
                          sizes="64px"
                          className={clsx('object-cover', {
                            'opacity-40 grayscale': !isAvailableForSale,
                          })}
                        />
                        {!isAvailableForSale && <OutOfStockCross />}
                      </span>
                      <span
                        className={clsx('text-center leading-tight', {
                          'font-semibold text-[#0b7a78]': isActive,
                          'text-neutral-900': isAvailableForSale && !isActive,
                          'text-neutral-400 line-through': !isAvailableForSale,
                        })}
                      >
                        {label}
                      </span>
                    </button>
                  )
                }

                // Значение без фото: обычная текстовая кнопка
                return (
                  <button
                    type="button"
                    key={optionID}
                    aria-pressed={isActive}
                    aria-disabled={!isAvailableForSale}
                    disabled={!isAvailableForSale}
                    title={isAvailableForSale ? label : `${label} — немає в наявності`}
                    onClick={onSelect}
                    className={clsx(
                      'relative min-w-[52px] overflow-hidden rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                      {
                        'border-[#0b7a78] bg-[#0b7a78] text-white shadow-sm': isActive,
                        'border-neutral-300 bg-white text-neutral-900 hover:border-[#0b7a78] hover:text-[#0b7a78]':
                          isAvailableForSale && !isActive,
                        'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400':
                          !isAvailableForSale,
                      },
                    )}
                  >
                    {label}
                    {!isAvailableForSale && <OutOfStockCross />}
                  </button>
                )
              })}
            </dd>
          </dl>
        )
      })}
    </>
  )
}