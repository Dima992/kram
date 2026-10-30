import type { Feed, Product, Variant } from '@/payload-types'

// Характеристика товара, нужна для Google-полей (пол, материал, цвет, размер)
export type FeedCharacteristic = {
  id: string
  googleAttribute?: string | null
  values?: { id?: string | null; googleValue?: string | null }[] | null
}

// Категория товара (родитель загружается через depth)
type FeedCategory = {
  id: string
  title?: string | null
  pathTitle?: string | null
  parent?: string | FeedCategory | null
}

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

const idOf = (value: unknown): string =>
  typeof value === 'object' && value !== null ? String((value as { id: unknown }).id) : String(value)

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

// Самая глубокая категория товара: у «Шуб» глубина больше, чем у «Жіночий одяг»
function pickDeepestCategory(product: Product): FeedCategory | undefined {
  const categories = ((product.categories ?? []) as unknown as (string | FeedCategory)[]).filter(
    (item): item is FeedCategory => typeof item === 'object' && item !== null,
  )

  const depthOf = (category: FeedCategory): number => {
    let depth = 0
    let parent = category.parent
    while (parent && typeof parent === 'object') {
      depth += 1
      parent = parent.parent
    }
    return depth
  }

  return categories.reduce<FeedCategory | undefined>((best, current) => {
    if (!best) return current
    return depthOf(current) > depthOf(best) ? current : best
  }, undefined)
}

// Google-значения характеристик товара: например { gender: 'female', material: 'wool' }
function getGoogleAttributes(
  product: Product,
  characteristics: FeedCharacteristic[],
): Record<string, string> {
  const stored = (product.attributes ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const characteristic of characteristics) {
    const attribute = characteristic.googleAttribute
    if (!attribute || result[attribute]) continue

    const selectedRaw = stored[String(characteristic.id)]
    const selectedIDs = Array.isArray(selectedRaw) ? selectedRaw.map(idOf) : []

    for (const valueID of selectedIDs) {
      const value = (characteristic.values ?? []).find((item) => String(item.id) === valueID)
      const googleValue = value?.googleValue?.trim()
      if (googleValue) {
        result[attribute] = googleValue
        break
      }
    }
  }

  return result
}

function renderProduct(
  product: Product,
  feed: Feed,
  baseURL: string,
  characteristics: FeedCharacteristic[],
): string | undefined {
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

  // Категория Google (номер из списка Google, например 2271)
  const googleCategory = product.googleCategory as unknown
  const googleCategoryID =
    typeof googleCategory === 'object' &&
    googleCategory !== null &&
    'googleId' in googleCategory &&
    (googleCategory as { googleId?: number | null }).googleId
      ? String((googleCategory as { googleId: number }).googleId)
      : undefined

  // Категория для product_type: полный путь самой глубокой категории
  const deepest = pickDeepestCategory(product)
  const productType = deepest?.pathTitle?.trim() || deepest?.title?.trim()

  // Google-атрибуты из характеристик товара
  const attributes = getGoogleAttributes(product, characteristics)
  const ageGroup = product.googleAgeGroup || 'adult'
  const condition = product.googleCondition || 'new'

  return `    <item>
      <g:id>${xmlEscape(String(product.id))}</g:id>
      <g:title>${xmlEscape(title)}</g:title>
      <g:description>${xmlEscape(description)}</g:description>
      <g:link>${xmlEscape(productURL)}</g:link>
      ${imageURL ? `<g:image_link>${xmlEscape(imageURL)}</g:image_link>` : ''}
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} UAH</g:price>
      <g:condition>${xmlEscape(condition)}</g:condition>
      ${brand ? `<g:brand>${xmlEscape(brand)}</g:brand>` : ''}
      ${product.gtin ? `<g:gtin>${xmlEscape(product.gtin.trim())}</g:gtin>` : ''}
      ${product.mpn ? `<g:mpn>${xmlEscape(product.mpn.trim())}</g:mpn>` : ''}
      ${googleCategoryID ? `<g:google_product_category>${googleCategoryID}</g:google_product_category>` : ''}
      ${productType ? `<g:product_type>${xmlEscape(productType)}</g:product_type>` : ''}
      ${attributes.gender ? `<g:gender>${xmlEscape(attributes.gender)}</g:gender>` : ''}
      <g:age_group>${xmlEscape(ageGroup)}</g:age_group>
      ${attributes.color ? `<g:color>${xmlEscape(attributes.color)}</g:color>` : ''}
      ${attributes.size ? `<g:size>${xmlEscape(attributes.size)}</g:size>` : ''}
      ${attributes.material ? `<g:material>${xmlEscape(attributes.material)}</g:material>` : ''}
      <g:identifier_exists>${hasIdentifiers ? 'true' : 'false'}</g:identifier_exists>
    </item>
`
}

export function generateProductFeed(
  feed: Feed,
  products: Product[],
  baseURL: string,
  characteristics: FeedCharacteristic[] = [],
): string {
  const items = products
    .filter((product) => !product.excludeFromFeed)
    .map((product) => renderProduct(product, feed, baseURL, characteristics))
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