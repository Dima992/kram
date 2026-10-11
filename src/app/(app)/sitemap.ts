import type { MetadataRoute } from 'next'

import configPromise from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'
import { getPayload } from 'payload'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: configPromise })
  const [pages, products] = await Promise.all([
    payload.find({
      collection: 'pages',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
      where: { _status: { equals: 'published' } },
    }),
    payload.find({
      collection: 'products',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
      where: { _status: { equals: 'published' } },
    }),
  ])

  const baseUrl = getServerSideURL().replace(/\/+$/, '')
  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/` },
    { url: `${baseUrl}/ru` },
    { url: `${baseUrl}/shop` },
    { url: `${baseUrl}/ru/shop` },
  ]

  for (const page of pages.docs) {
    if (!page.slug || page.slug === 'home') continue

    const lastModified = page.updatedAt ? new Date(page.updatedAt) : undefined
    entries.push(
      { url: `${baseUrl}/${page.slug}`, lastModified },
      { url: `${baseUrl}/ru/${page.slug}`, lastModified },
    )
  }

  for (const product of products.docs) {
    if (!product.slug) continue

    const lastModified = product.updatedAt ? new Date(product.updatedAt) : undefined
    entries.push(
      { url: `${baseUrl}/products/${product.slug}`, lastModified },
      { url: `${baseUrl}/ru/products/${product.slug}`, lastModified },
    )
  }

  return entries
}
