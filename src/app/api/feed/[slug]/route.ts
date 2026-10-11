import configPromise from '@payload-config'
import type { Product } from '@/payload-types'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import { generateProductFeed } from '@/utilities/productFeed'
import { NextResponse } from 'next/server'
import { getPayload, Where } from 'payload'

function relationIDs(relations: (string | { id: string })[] | null | undefined): string[] {
  return (relations || []).map((relation) => (typeof relation === 'string' ? relation : relation.id))
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

    if (feed.onlyInStock) {
      conditions.push({ inventory: { greater_than: 0 } })
    }

    if (categoryIDs.length > 0 && includedProductIDs.length > 0) {
      conditions.push({
        or: [
          { categories: { in: categoryIDs } },
          { id: { in: includedProductIDs } },
        ],
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
        overrideAccess: true,
      })

      products.push(...result.docs)
      hasNextPage = result.hasNextPage
      page += 1
    }

    const xml = generateProductFeed(feed, products, baseURL)

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
