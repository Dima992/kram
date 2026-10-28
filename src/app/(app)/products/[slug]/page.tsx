import { RenderBlocks } from '@/blocks/RenderBlocks'
import { GridTileImage } from '@/components/Grid/tile'
import { Gallery } from '@/components/product/Gallery'
import { ProductCharacteristics, type CharacteristicView } from '@/components/product/ProductCharacteristics'
import { ProductDescription } from '@/components/product/ProductDescription'
import { StickyBuyBar } from '@/components/product/StickyBuyBar'
import { Button } from '@/components/ui/button'
import type { Media, Product } from '@/payload-types'
import configPromise from '@payload-config'
import { ChevronLeftIcon } from 'lucide-react'
import { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { draftMode, headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { Suspense } from 'react'

export const revalidate = 3600

type Locale = 'uk' | 'ru'

type Args = {
  params: Promise<{
    slug: string
  }>
}

// Язык берём из метки, которую ставит proxy
const getLocale = async (): Promise<Locale> => {
  const headers = await getHeaders()
  return headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
}

// Оставляем и фото, и видео YouTube (у видео нет фото, поэтому раньше их отбрасывало)
const getGallery = (product: Product) =>
  product.gallery
    ?.filter(
      (item) =>
        typeof item.image === 'object' || (item.mediaType === 'youtube' && item.youtubeUrl),
    )
    .map((item) => ({
      ...item,
      image: typeof item.image === 'object' ? (item.image as Media) : undefined,
    })) || []

// Характеристики, которые выбраны у товара: только выбранные значения, пустые скрываем
const buildCharacteristics = async (
  product: Product,
  locale: Locale,
): Promise<CharacteristicView[]> => {
  const raw = (product as Product & { attributes?: unknown }).attributes
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []

  const selectedMap = raw as Record<string, unknown>
  const ids = Object.keys(selectedMap).filter((id) => {
    const value = selectedMap[id]
    return Array.isArray(value) && value.length > 0
  })
  if (ids.length === 0) return []

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'characteristics',
    depth: 0,
    limit: 200,
    pagination: false,
    sort: 'order',
    where: {
      id: { in: ids },
    },
  })

  const items: CharacteristicView[] = []

  for (const ch of result.docs) {
    const chId = String(ch.id)
    const selected = ((selectedMap[chId] as unknown[] | undefined) ?? []).map(String)

    const values = (ch.values ?? [])
      .filter((v) => v.id)
      .map((v) => ({
        id: String(v.id),
        label:
          locale === 'ru'
            ? v.label_ru || v.label_uk || ''
            : v.label_uk || v.label_ru || '',
        selected: selected.includes(String(v.id)),
      }))

    // Если ни одно значение не выбрано — характеристику не показываем
    if (!values.some((v) => v.selected)) continue

    items.push({
      id: chId,
      name: locale === 'ru' ? ch.name_ru || ch.name_uk : ch.name_uk,
      values,
    })
  }

  return items
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const product = await queryProductBySlug({ slug, locale })

  if (!product) return notFound()

  const gallery = getGallery(product).filter((item) => item.image)

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const canIndex = product._status === 'published'

  const seoImage = metaImage || (gallery.length ? (gallery[0]?.image as Media) : undefined)

  return {
    description: product.meta?.description || '',
    openGraph: seoImage?.url
      ? {
          images: [
            {
              alt: seoImage?.alt ?? undefined,
              height: seoImage.height!,
              url: seoImage?.url,
              width: seoImage.width!,
            },
          ],
        }
      : null,
    robots: {
      follow: canIndex,
      googleBot: {
        follow: canIndex,
        index: canIndex,
      },
      index: canIndex,
    },
    title: product.meta?.title || product.title,
  }
}

export default async function ProductPage({ params }: Args) {
  const { slug } = await params
  const locale = await getLocale()
  const product = await queryProductBySlug({ slug, locale })

  if (!product) return notFound()

  const gallery = getGallery(product)
  const characteristics = await buildCharacteristics(product, locale)

  const metaImage = typeof product.meta?.image === 'object' ? product.meta?.image : undefined
  const hasStock = product.enableVariants
    ? product?.variants?.docs?.some((variant) => {
        if (typeof variant !== 'object') return false
        return variant.inventory && variant?.inventory > 0
      })
    : product.inventory! > 0

  // Цена только в гривнах. Цены в долларах и запасные варианты не используются.
  const price = product.priceInUAH

  const productJsonLd = {
    name: product.title,
    '@context': 'https://schema.org',
    '@type': 'Product',
    description: product.description,
    image: metaImage?.url,
    offers: {
      '@type': 'AggregateOffer',
      availability: hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      price: price ?? undefined,
      priceCurrency: 'UAH',
    },
  }

  const relatedProducts =
    product.relatedProducts?.filter((relatedProduct) => typeof relatedProduct === 'object') ?? []

  return (
    <React.Fragment>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
        type="application/ld+json"
      />
      <div className="container pt-8 pb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/shop">
            <ChevronLeftIcon />
            All products
          </Link>
        </Button>
        <div className="flex flex-col gap-12 rounded-lg border p-8 md:py-12 lg:flex-row lg:gap-8 bg-primary-foreground">
          <div className="order-2 h-full w-full basis-full lg:order-none lg:basis-1/2">
            <Suspense
              fallback={
                <div className="relative aspect-square h-full max-h-137.5 w-full overflow-hidden" />
              }
            >
              {Boolean(gallery?.length) && <Gallery gallery={gallery} />}
            </Suspense>
          </div>

          <div className="contents lg:flex lg:basis-1/2 lg:flex-col lg:gap-6">
            <ProductDescription product={product} />
          </div>
        </div>
      </div>

      {/* Характеристики: под фото, описанием и видео, перед кнопкой покупки */}
      <div className="container">
        <ProductCharacteristics title="Характеристики" items={characteristics} />
      </div>

      <StickyBuyBar product={product} />
      {product.layout?.length ? <RenderBlocks blocks={product.layout} /> : <></>}

      {relatedProducts.length ? (
        <div className="container">
          <RelatedProducts products={relatedProducts as Product[]} />
        </div>
      ) : (
        <></>
      )}
    </React.Fragment>
  )
}

function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null

  return (
    <div className="py-8">
      <h2 className="mb-4 text-2xl font-bold">Related Products</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {products.map((product) => (
          <li
            className="aspect-square w-full flex-none min-[475px]:w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
            key={product.id}
          >
            <Link className="relative h-full w-full" href={`/products/${product.slug}`}>
              <GridTileImage
                label={{
                  amount: product.priceInUAH!,
                  title: product.title,
                }}
                media={product.meta?.image as Media}
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

const queryProductBySlug = async ({ slug, locale }: { slug: string; locale: Locale }) => {
  const { isEnabled: draft } = await draftMode()

  if (!draft) {
    return getPublishedProductBySlug(slug, locale)
  }

  return findProductBySlug(slug, true, locale)
}

const findProductBySlug = async (slug: string, draft: boolean, locale: Locale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    depth: 3,
    draft,
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
    populate: {
      variants: {
        title: true,
        priceInUAH: true,
        inventory: true,
        options: true,
      },
    },
  })

  return result.docs?.[0] || null
}

// Кэш отдельно для каждого языка: slug и locale попадают в ключ кэша
const getPublishedProductBySlug = unstable_cache(
  async (slug: string, locale: Locale) => findProductBySlug(slug, false, locale),
  ['published-product'],
  { revalidate: 3600, tags: ['products'] },
)