import type { Feed, Product, Variant } from '@/payload-types'

const xmlEscape = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[<>&'"]/g, (character) => {
      switch (character) {
        case '<':
          return '&lt;'
        case '>':
          return '&gt;'
        case '&':
          return '&amp;'
        case "'":
          return '&apos;'
        case '"':
          return '&quot;'
        default:
          return character
      }
    })

function richTextToPlainText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''

  const texts: string[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') texts.push(record.text)
    if (record.root) visit(record.root)
    if (record.children) visit(record.children)
  }

  visit(value)
  return texts.join(' ').replace(/\s+/g, ' ').trim()
}

function getImageURL(product: Product, baseURL: string): string | undefined {
  const image = product.gallery?.find((item) => typeof item.image === 'object')?.image
  if (!image || typeof image === 'string') return undefined

  if (image.url) return new URL(image.url, baseURL).toString()

  if (image.filename && process.env.NEXT_PUBLIC_S3_HOSTNAME) {
    const host = process.env.NEXT_PUBLIC_S3_HOSTNAME.replace(/\/+$/, '')
    return `${host}/${encodeURIComponent(image.filename)}`
  }

  return undefined
}

function isProductInStock(product: Product): boolean {
  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is Variant => typeof variant === 'object' && variant !== null,
  )

  if (variants.length > 0) {
    return variants.some((variant) => typeof variant.inventory === 'number' && variant.inventory > 0)
  }

  return (product.inventory ?? 0) > 0
}

function renderProduct(product: Product, feed: Feed, baseURL: string): string | undefined {
  const title = product.title?.trim()
  const slug = product.slug?.trim()
  const price = product.priceInUAH
  const imageURL = getImageURL(product, baseURL)

  if (
    !title ||
    !slug ||
    !imageURL ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return undefined
  }

  const localePrefix = feed.language === 'uk' ? '' : `/${feed.language}`
  const productURL = `${baseURL}${localePrefix}/products/${encodeURIComponent(slug)}`
  const description = richTextToPlainText(product.description) || title
  const brand = product.brand?.trim() || feed.defaultBrand?.trim()
  const hasIdentifiers = Boolean(product.gtin?.trim() || product.mpn?.trim())
  const availability = isProductInStock(product) ? 'in_stock' : 'out_of_stock'
  const category = product.categories?.find((item) => typeof item === 'object')
  const categoryTitle = category && typeof category === 'object' ? category.title : undefined

  return `    <item>
      <g:id>${xmlEscape(String(product.id))}</g:id>
      <g:title>${xmlEscape(title)}</g:title>
      <g:description>${xmlEscape(description)}</g:description>
      <g:link>${xmlEscape(productURL)}</g:link>
      ${imageURL ? `<g:image_link>${xmlEscape(imageURL)}</g:image_link>` : ''}
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} UAH</g:price>
      <g:condition>new</g:condition>
      ${brand ? `<g:brand>${xmlEscape(brand)}</g:brand>` : ''}
      ${product.gtin ? `<g:gtin>${xmlEscape(product.gtin.trim())}</g:gtin>` : ''}
      ${product.mpn ? `<g:mpn>${xmlEscape(product.mpn.trim())}</g:mpn>` : ''}
      ${categoryTitle ? `<g:product_type>${xmlEscape(categoryTitle)}</g:product_type>` : ''}
      <g:identifier_exists>${hasIdentifiers ? 'true' : 'false'}</g:identifier_exists>
    </item>
`
}

export function generateProductFeed(feed: Feed, products: Product[], baseURL: string): string {
  const items = products
    .filter((product) => !product.excludeFromFeed)
    .map((product) => renderProduct(product, feed, baseURL))
    .filter((item): item is string => Boolean(item))

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(feed.title)}</title>
    <link>${xmlEscape(baseURL)}</link>
    <description>${xmlEscape(`Product feed for ${feed.platform.toUpperCase()}`)}</description>
${items.join('')}  </channel>
</rss>`
}