'use client'

import type { Product } from '@/payload-types'

import { createUrl } from '@/utilities/createUrl'
import clsx from 'clsx'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

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

  return variantTypes?.map((type) => {
    if (!type || typeof type !== 'object') {
      return <React.Fragment key={Math.random()} />
    }

    const options = type.options?.docs

    if (!options || !Array.isArray(options) || !options.length) {
      return <React.Fragment key={type.id} />
    }

    return (
      <dl className="" key={type.id}>
        <dt className="mb-3 text-sm font-medium text-neutral-900">{type.label}</dt>
        <dd className="flex flex-wrap gap-2">
          {options.map((option) => {
            if (!option || typeof option !== 'object') {
              return <React.Fragment key={Math.random()} />
            }

            const optionID = option.id
            const optionKeyLowerCase = type.name

            // Берём текущие параметры из адреса, чтобы не потерять другие выборы
            const optionSearchParams = new URLSearchParams(searchParams.toString())

            // Убираем вариант и картинку, чтобы цикл работал правильно
            optionSearchParams.delete('variant')
            optionSearchParams.delete('image')

            // Подставляем текущую опцию: так видно, как изменится адрес при клике
            optionSearchParams.set(optionKeyLowerCase, String(optionID))

            const currentOptions = Array.from(optionSearchParams.values())

            let isAvailableForSale = true

            // Ищем подходящий вариант
            if (variants) {
              const matchingVariant = variants
                .filter((variant) => typeof variant === 'object')
                .find((variant) => {
                  if (!variant.options || !Array.isArray(variant.options)) return false

                  // Все опции варианта должны совпадать с текущими параметрами адреса
                  return variant.options.every((variantOption) => {
                    if (typeof variantOption !== 'object')
                      return currentOptions.includes(String(variantOption))

                    return currentOptions.includes(String(variantOption.id))
                  })
                })

              if (matchingVariant) {
                // Нашли вариант: записываем его id в адрес
                optionSearchParams.set('variant', String(matchingVariant.id))

                isAvailableForSale = Boolean(
                  matchingVariant.inventory && matchingVariant.inventory > 0,
                )
              }
            }

            const optionUrl = createUrl(pathname, optionSearchParams)

            // Кнопка выбрана, если её значение в адресе и товар есть в наличии
            const isActive =
              Boolean(isAvailableForSale) &&
              searchParams.get(optionKeyLowerCase) === String(optionID)

            return (
              <button
                type="button"
                key={option.id}
                aria-pressed={isActive}
                aria-disabled={!isAvailableForSale}
                disabled={!isAvailableForSale}
                title={
                  isAvailableForSale
                    ? option.label ?? ''
                    : `${option.label ?? ''} — немає в наявності`
                }
                onClick={() => {
                  router.replace(`${optionUrl}`, {
                    scroll: false,
                  })
                }}
                className={clsx(
                  'min-w-[52px] rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                  {
                    // Выбрано: тёмно-бирюзовый, как кнопка «Купить», белый текст
                    'border-[#0b7a78] bg-[#0b7a78] text-white shadow-sm': isActive,
                    // Есть в наличии, но не выбрано: белый фон, тёмный текст, рамка
                    'border-neutral-300 bg-white text-neutral-900 hover:border-[#0b7a78] hover:text-[#0b7a78]':
                      isAvailableForSale && !isActive,
                    // Нет в наличии: серый фон, зачёркнутый текст, курсор «запрещено»
                    'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through':
                      !isAvailableForSale,
                  },
                )}
              >
                {option.label}
              </button>
            )
          })}
        </dd>
      </dl>
    )
  })
}