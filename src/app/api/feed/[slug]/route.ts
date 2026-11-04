import type { Product, Variant } from '@/payload-types'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import {
  generateProductFeed,
  type FeedCharacteristic,
  type FeedOptionLookup,
} from '@/utilities/productFeed'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload, Where } from 'payload'

function relationIDs(relations: (string | { id: string })[] | null | undefined): string[] {
  return (relations || []).map((relation) => (typeof relation === 'string' ? relation : relation.id))
}

function hasStock(product: Product): boolean {
  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )

  if (variants.length > 0) {
    return variants.some((variant) => typeof variant.inventory === 'number' && variant.inventory > 0)
  }

  return (product.inventory ?? 0) > 0
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'feeds',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })

    const feed = docs[0]
    if (!feed || feed.enabled === false) {
      return new NextResponse('Feed not found or disabled', { status: 404 })
    }

    const categoryIDs = relationIDs(feed.categories)
    const includedProductIDs = relationIDs(feed.includeProducts)
    const excludedProductIDs = relationIDs(feed.excludeProducts)

    const conditions: Where[] = [{ _status: { equals: 'published' } }]

    if (categoryIDs.length > 0 && includedProductIDs.length > 0) {
      conditions.push({
        or: [{ categories: { in: categoryIDs } }, { id: { in: includedProductIDs } }],
      })
    } else if (categoryIDs.length > 0) {
      conditions.push({ categories: { in: categoryIDs } })
    } else if (includedProductIDs.length > 0) {
      conditions.push({ id: { in: includedProductIDs } })
    }

    if (excludedProductIDs.length > 0) {
      conditions.push({ id: { not_in: excludedProductIDs } })
    }

    const settings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })
    let baseURL: string
    try {
      baseURL = getPublicSiteURL(settings.siteURL)
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: 'Товарний фід: некоректна публічна URL-адреса сайту',
      })
      return new NextResponse('Public site URL is not configured correctly', { status: 503 })
    }

    // Характеристики с Google-атрибутами (пол, материал, цвет, размер)
    const { docs: characteristics } = await payload.find({
      collection: 'characteristics',
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    // Названия типов вариантов (имя типа = char-<id характеристики>)
    const { docs: variantTypeDocs } = await payload.find({
      collection: 'variantTypes',
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const typeNameByID: Record<string, string> = {}
    for (const type of variantTypeDocs) {
      typeNameByID[String(type.id)] = type.name ?? ''
    }

    // Значения вариантов: подпись и к какой характеристике относятся
    const { docs: optionDocs } = await payload.find({
      collection: 'variantOptions',
      limit: 5000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    const optionLookup: FeedOptionLookup = {}
    for (const option of optionDocs) {
      const rawType = option.variantType as unknown
      const typeID =
        rawType && typeof rawType === 'object'
          ? String((rawType as { id: unknown }).id)
          : String(rawType ?? '')
      const typeName = typeNameByID[typeID] ?? ''
      if (!typeName.startsWith('char-')) continue

      optionLookup[String(option.id)] = {
        label: option.label ?? '',
        characteristicID: typeName.slice(5),
      }
    }

    const products: Product[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const result = await payload.find({
        collection: 'products',
        locale: feed.language,
        depth: 2,
        limit: 500,
        page,
        where: { and: conditions },
        joins: { variants: { limit: 100 } },
        overrideAccess: true,
      })

      products.push(...result.docs)
      hasNextPage = result.hasNextPage
      page += 1
    }

    const feedProducts = feed.onlyInStock ? products.filter(hasStock) : products

    const xml = generateProductFeed(
      feed,
      feedProducts,
      baseURL,
      characteristics as FeedCharacteristic[],
      optionLookup,
    )

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Ошибка генерации динамического фида:', error)
    return new NextResponse('Error generating feed', { status: 500 })
  }
}