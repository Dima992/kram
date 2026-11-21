'use client'
import type { Product, Variant } from '@/payload-types'

import { AddToCart } from '@/components/Cart/AddToCart'
import { StockIndicator } from '@/components/product/StockIndicator'
import { RichText } from '@/components/RichText'
import { formatSaleEnd, getSaleInfo, type SaleInfo } from '@/utilities/sale'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { VariantSelector } from './VariantSelector'

// Цена на странице товара: число и «грн» после него
const formatPrice = (amount: number) => `${amount.toLocaleString('uk-UA')} грн`

const hintText = {
  uk: 'Оберіть варіант, щоб додати в кошик.',
  ru: 'Выберите вариант, чтобы добавить в корзину.',
}

type Priced = { amount: number; sale: SaleInfo | null }

// Цена и скидка варианта.
// Своя цена (basePrice заполнен): считаем по полям варианта.
// Своей цены нет: берём цену товара вместе с его скидкой.
const priceOfVariant = (variant: Variant, product: Product): Priced | null => {
  if (Number(variant.basePrice) > 0) {
    const sale = getSaleInfo(variant)
    const amount = sale ? sale.newPrice : Number(variant.priceInUAH) || 0
    return amount > 0 ? { amount, sale } : null
  }

  const productSale = getSaleInfo(product)
  if (productSale) return { amount: productSale.newPrice, sale: productSale }

  const amount = Number(product.priceInUAH) || 0
  return amount > 0 ? { amount, sale: null } : null
}

// Показывает цену. Если есть скидка, старую цену зачёркивает, добавляет процент и дату окончания
function PriceView({
  amount,
  sale,
  locale,
}: {
  amount: number
  sale: SaleInfo | null
  locale: 'uk' | 'ru'
}) {
  if (!sale) return <>{formatPrice(amount)}</>

  const endText = formatSaleEnd(sale.endsAt, locale)

  return (
    <>
      <s className="mr-2 text-lg font-normal text-neutral-600">{formatPrice(sale.oldPrice)}</s>
      {formatPrice(sale.newPrice)}
      <span className="ml-3 rounded bg-[#0b7a78] px-2 py-0.5 align-middle text-sm font-medium text-white">
        -{sale.percent}%
      </span>
      {endText && (
        <span className="mt-1 block text-sm font-normal text-neutral-600">{endText}</span>
      )}
    </>
  )
}

function ProductPrice({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )
  const hasVariants = Boolean(product.enableVariants && variants.length > 0)
  const selectedVariantID = searchParams.get('variant')

  // Выбран конкретный вариант
  if (hasVariants && selectedVariantID) {
    const selected = variants.find((variant) => String(variant.id) === selectedVariantID)
    const price = selected ? priceOfVariant(selected, product) : null
    return price ? <PriceView amount={price.amount} sale={price.sale} locale={locale} /> : null
  }

  // Вариант не выбран: показываем наименьшую цену
  if (hasVariants) {
    const prices = variants
      .map((variant) => priceOfVariant(variant, product))
      .filter((price): price is Priced => price !== null)
    if (prices.length === 0) return null

    const lowest = prices.reduce((min, price) => (price.amount < min.amount ? price : min))
    const hasDifferentPrices = new Set(prices.map((price) => price.amount)).size > 1

    return (
      <>
        {hasDifferentPrices && <span className="mr-2 text-base font-normal">від</span>}
        <PriceView amount={lowest.amount} sale={lowest.sale} locale={locale} />
      </>
    )
  }

  // Товар без вариантов
  const sale = getSaleInfo(product)
  const amount = sale ? sale.newPrice : Number(product.priceInUAH) || 0
  return amount > 0 ? <PriceView amount={amount} sale={sale} locale={locale} /> : null
}

// Подсказка: показывается, пока вариант не выбран
function VariantHint({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const hasVariants = Boolean(product.enableVariants && product.variants?.docs?.length)

  if (!hasVariants || searchParams.get('variant')) return null

  return <p className="text-sm text-neutral-600">{hintText[locale]}</p>
}

function QuantityControl({
  quantity,
  max,
  onChange,
}: {
  quantity: number
  max: number
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
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        aria-label="Больше"
      >
        +
      </button>
    </div>
  )
}

// Внутренняя часть: здесь читается выбранный вариант из адреса
function ProductDescriptionContent({ product }: { product: Product }) {
  const searchParams = useSearchParams()
  const hasVariants = Boolean(product.enableVariants && product.variants?.docs?.length)
  const [quantity, setQuantity] = useState(1)

  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )
  const selectedVariant = hasVariants
    ? variants.find((variant) => String(variant.id) === searchParams.get('variant'))
    : undefined

  // Лимит: остаток выбранного варианта; у товара без вариантов ограничения нет
  const maxQuantity = selectedVariant
    ? Math.max(1, selectedVariant.inventory ?? 0)
    : Number.POSITIVE_INFINITY

  // Если выбрали вариант с меньшим остатком, количество уменьшаем автоматически
  const effectiveQuantity = Math.min(quantity, maxQuantity)

  return (
    <>
      {/* Только название: цена переехала к кнопке покупки */}
      <div className="order-1 lg:order-none">
        <h1 className="text-2xl font-medium">{product.title}</h1>
      </div>

      {/* Варианты, цена, наличие, подсказка, количество и кнопка: после фото */}
      <div className="order-3 flex flex-col gap-6 lg:order-none">
        {hasVariants && (
          <>
            <Suspense fallback={null}>
              <VariantSelector product={product} />
            </Suspense>
            <hr />
          </>
        )}

        {/* Цена: число и «грн», без фона, акцентным цветом над кнопкой «Купить» */}
        <div className="bg-transparent text-[28px] font-bold leading-none text-[#0b7a78]">
          <Suspense fallback={null}>
            <ProductPrice product={product} />
          </Suspense>
        </div>

        <div className="flex items-center justify-between">
          <Suspense fallback={null}>
            <StockIndicator product={product} />
          </Suspense>
        </div>

        {/* Подсказка, пока вариант не выбран */}
        <Suspense fallback={null}>
          <VariantHint product={product} />
        </Suspense>

        <div id="buy-block" className="flex items-center gap-3">
          <QuantityControl
            quantity={effectiveQuantity}
            max={maxQuantity}
            onChange={(value) => setQuantity(Math.min(value, maxQuantity))}
          />
          <div
            className={`min-w-0 flex-1 [&_button]:w-full [&_button]:border-[#0b7a78] [&_button]:bg-[#0b7a78] [&_button]:text-white [&_button:hover]:opacity-90 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:border-neutral-300 [&_button:disabled]:bg-neutral-300 [&_button:disabled]:text-neutral-500`}
          >
            <Suspense fallback={null}>
              <AddToCart product={product} quantity={effectiveQuantity} />
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

// Внешняя часть: оборачивает всё в Suspense, как и остальные части страницы
export function ProductDescription({ product }: { product: Product }) {
  return (
    <Suspense fallback={null}>
      <ProductDescriptionContent product={product} />
    </Suspense>
  )
}