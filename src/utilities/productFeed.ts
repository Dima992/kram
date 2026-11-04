import type { Feed, Product, Variant } from '@/payload-types'

export type FeedCharacteristic = {
  id: string
  googleAttribute?: string | null
  values?:
    | {
        id?: string | null
        label_uk?: string | null
        label_ru?: string | null
        googleValue?: string | null
      }[]
    | null
}

// Значение варианта: подпись, характеристика и ID значения характеристики (связь по ID)
export type FeedOptionLookup = Record<
  string,
  { label: string; characteristicID: string; valueID: string }
>

type FeedCategory = {
  id: string
  title?: string | null
  pathTitle?: string | null
  parent?: string | FeedCategory | null
}

type VariantRow = Variant & { priceInUAH?: number | null; sku?: string | null }

type FeedItem = {
  id: string
  groupID?: string
  title: string
  description: string
  link: string
  imageURL?: string
  availability: 'in_stock' | 'backorder' | 'out_of_stock'
  price: number
  condition: string
  brand?: string
  gtin?: string
  mpn?: string
  googleCategoryID?: string
  productType?: string
  attributes: Record<string, string>
  ageGroup: string
  hasIdentifiers: boolean
}

// Имя тега Google: только латиница, цифры и подчёркивание (например color, weight)
const TAG_PATTERN = /^[a-z][a-z0-9_]*$/

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

const hasPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

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

// Полный адрес картинки из загруженного файла (или пусто, если адреса нет)
function mediaURL(image: unknown, baseURL: string): string | undefined {
  if (!image || typeof image !== 'object') return undefined
  const media = image as { url?: string | null; filename?: string | null }

  if (media.url) return new URL(media.url, baseURL).toString()

  if (media.filename && process.env.NEXT_PUBLIC_S3_HOSTNAME) {
    const host = process.env.NEXT_PUBLIC_S3_HOSTNAME.replace(/\/+$/, '')
    return `${host}/${encodeURIComponent(media.filename)}`
  }

  return undefined
}

// Главное фото товара: первое фото галереи
function getImageURL(product: Product, baseURL: string): string | undefined {
  const item = (product.gallery ?? []).find(
    (entry) => entry && entry.image && typeof entry.image === 'object',
  )
  return mediaURL(item?.image, baseURL)
}

// Значение варианта, привязанное к строке галереи (например «Білий»)
function galleryOptionID(entry: unknown): string | null {
  const value = (entry as { variantOption?: unknown })?.variantOption
  if (value === null || value === undefined || value === '') return null
  return idOf(value)
}

// Фото варианта: только у характеристик, где включено «Фото потрібні»
function getVariantImageURL(
  product: Product,
  optionIDs: string[],
  lookup: FeedOptionLookup,
  baseURL: string,
): string | undefined {
  const settings =
    (product as unknown as { variantSettings?: Record<string, { photos?: boolean }> | null })
      .variantSettings ?? {}

  for (const optionID of optionIDs) {
    const info = lookup[optionID]
    if (!info || !settings[info.characteristicID]?.photos) continue

    const entry = (product.gallery ?? []).find(
      (item) =>
        item &&
        item.mediaType !== 'youtube' &&
        item.image &&
        typeof item.image === 'object' &&
        galleryOptionID(item) === optionID,
    )
    const url = mediaURL(entry?.image, baseURL)
    if (url) return url
  }
  return undefined
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

// Google-значения характеристик, выбранных у самого товара (используются, только если вариантов нет)
function getGoogleAttributes(
  product: Product,
  characteristics: FeedCharacteristic[],
): Record<string, string> {
  const stored = (product.attributes ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const characteristic of characteristics) {
    const attribute = characteristic.googleAttribute
    if (!attribute || !TAG_PATTERN.test(attribute) || result[attribute]) continue

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

const optionIDsOf = (variant: VariantRow): string[] =>
  (Array.isArray(variant.options) ? (variant.options as unknown[]) : []).map(idOf)

// Подписи значений варианта, например ['Білий', 'M']
function variantLabels(variant: VariantRow, lookup: FeedOptionLookup): string[] {
  return optionIDsOf(variant)
    .map((optionID) => lookup[optionID]?.label.trim())
    .filter((label): label is string => Boolean(label))
}

// Google-значения характеристик варианта: связь по ID значения, без сравнения текста.
// Варианты без связи (созданы вручную) в фид Google-атрибуты не получают
function getVariantAttributes(
  variant: VariantRow,
  lookup: FeedOptionLookup,
  characteristics: FeedCharacteristic[],
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const optionID of optionIDsOf(variant)) {
    const info = lookup[optionID]
    if (!info || !info.valueID) continue

    const characteristic = characteristics.find((item) => String(item.id) === info.characteristicID)
    const attribute = characteristic?.googleAttribute
    if (!characteristic || !attribute || !TAG_PATTERN.test(attribute)) continue

    const value = (characteristic.values ?? []).find((item) => String(item.id) === info.valueID)
    const googleValue = value?.googleValue?.trim()
    if (googleValue) result[attribute] = googleValue
  }

  return result
}

const productAvailability = (status?: string | null): FeedItem['availability'] =>
  status === 'backorder' ? 'backorder' : status === 'outOfStock' ? 'out_of_stock' : 'in_stock'

// Остаток варианта 0 — нет в наличии. Иначе статус товара
const variantAvailability = (variant: VariantRow, productStatus?: string | null) => {
  const inventory = typeof variant.inventory === 'number' ? variant.inventory : 0
  if (inventory <= 0) return 'out_of_stock' as const
  return productAvailability(productStatus)
}

// Строки фида для одного товара: одна строка без вариантов или по строке на вариант
function buildItems(
  product: Product,
  feed: Feed,
  baseURL: string,
  characteristics: FeedCharacteristic[],
  lookup: FeedOptionLookup,
): FeedItem[] {
  const title = product.title?.trim()
  const slug = product.slug?.trim()
  const imageURL = getImageURL(product, baseURL)
  if (!title || !slug || !imageURL) return []

  const localePrefix = feed.language === 'uk' ? '' : `/${feed.language}`
  const productURL = `${baseURL}${localePrefix}/products/${encodeURIComponent(slug)}`
  const description = richTextToPlainText(product.description)
  if (!description) return []
  const brand = product.brand?.trim() || feed.defaultBrand?.trim() || undefined
  const gtin = product.gtin?.trim() || undefined
  const mpn = product.mpn?.trim() || undefined
  const hasIdentifiers = Boolean(gtin || mpn)

  // Категория Google (номер из списка Google, например 2271)
  const googleCategory = product.googleCategory as unknown
  const googleCategoryID =
    typeof googleCategory === 'object' &&
    googleCategory !== null &&
    'googleId' in googleCategory &&
    (googleCategory as { googleId?: number | null }).googleId
      ? String((googleCategory as { googleId: number }).googleId)
      : undefined

  const deepest = pickDeepestCategory(product)
  const productType = deepest?.pathTitle?.trim() || deepest?.title?.trim() || undefined

  const ageGroup = product.googleAgeGroup || 'adult'
  const condition = product.googleCondition || 'new'
  const productAttributes = getGoogleAttributes(product, characteristics)

  const common = {
    description,
    imageURL,
    brand,
    gtin,
    mpn,
    hasIdentifiers,
    googleCategoryID,
    productType,
    ageGroup,
    condition,
  }

  const variants = (product.variants?.docs ?? []).filter(
    (variant): variant is VariantRow => typeof variant === 'object' && variant !== null,
  )

  // Товар без вариантов: одна строка
  if (variants.length === 0) {
    if (!hasPrice(product.priceInUAH)) return []

    return [
      {
        ...common,
        id: String(product.id),
        title,
        link: productURL,
        price: product.priceInUAH,
        availability: productAvailability(product.stockStatus),
        attributes: productAttributes,
      },
    ]
  }

  // Товар с вариантами: строка на каждый вариант
  return variants.flatMap((variant) => {
    // Своя цена варианта, иначе цена товара
    const price = hasPrice(variant.priceInUAH) ? variant.priceInUAH : product.priceInUAH
    if (!hasPrice(price)) return []

    const optionIDs = optionIDsOf(variant)
    const labels = variantLabels(variant, lookup)

    return [
      {
        ...common,
        // Фото варианта, если его нет, — главное фото товара
        imageURL: getVariantImageURL(product, optionIDs, lookup, baseURL) ?? imageURL,
        id: variant.sku?.trim() || `${product.id}-${variant.id}`,
        groupID: String(product.id),
        title: labels.length ? `${title}, ${labels.join(', ')}` : title,
        link: `${productURL}?variant=${encodeURIComponent(String(variant.id))}`,
        price,
        availability: variantAvailability(variant, product.stockStatus),
        // У варианта свои значения; значения товара не подмешиваем
        attributes: getVariantAttributes(variant, lookup, characteristics),
      },
    ]
  })
}

// Все теги из характеристик: выводим любой тег с заполненным значением.
// age_group выводим отдельно (из карточки товара)
const renderAttributes = (attributes: Record<string, string>): string =>
  Object.entries(attributes)
    .filter(([tag, value]) => TAG_PATTERN.test(tag) && tag !== 'age_group' && value)
    .map(([tag, value]) => `      <g:${tag}>${xmlEscape(value)}</g:${tag}>\n`)
    .join('')

const renderItem = (item: FeedItem): string => `    <item>
      <g:id>${xmlEscape(item.id)}</g:id>
      ${item.groupID ? `<g:item_group_id>${xmlEscape(item.groupID)}</g:item_group_id>` : ''}
      <g:title>${xmlEscape(item.title)}</g:title>
      <g:description>${xmlEscape(item.description)}</g:description>
      <g:link>${xmlEscape(item.link)}</g:link>
      ${item.imageURL ? `<g:image_link>${xmlEscape(item.imageURL)}</g:image_link>` : ''}
      <g:availability>${item.availability}</g:availability>
      <g:price>${item.price.toFixed(2)} UAH</g:price>
      <g:condition>${xmlEscape(item.condition)}</g:condition>
      ${item.brand ? `<g:brand>${xmlEscape(item.brand)}</g:brand>` : ''}
      ${item.gtin ? `<g:gtin>${xmlEscape(item.gtin)}</g:gtin>` : ''}
      ${item.mpn ? `<g:mpn>${xmlEscape(item.mpn)}</g:mpn>` : ''}
      ${item.googleCategoryID ? `<g:google_product_category>${item.googleCategoryID}</g:google_product_category>` : ''}
      ${item.productType ? `<g:product_type>${xmlEscape(item.productType)}</g:product_type>` : ''}
      <g:age_group>${xmlEscape(item.ageGroup)}</g:age_group>
${renderAttributes(item.attributes)}      <g:identifier_exists>${item.hasIdentifiers ? 'true' : 'false'}</g:identifier_exists>
    </item>
`

export function generateProductFeed(
  feed: Feed,
  products: Product[],
  baseURL: string,
  characteristics: FeedCharacteristic[] = [],
  lookup: FeedOptionLookup = {},
): string {
  const items = products
    .filter((product) => !product.excludeFromFeed)
    .flatMap((product) => buildItems(product, feed, baseURL, characteristics, lookup))
    .filter((item) => !(feed.onlyInStock && item.availability === 'out_of_stock'))

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(feed.title)}</title>
    <link>${xmlEscape(baseURL)}</link>
    <description>${xmlEscape(`Product feed for ${feed.platform.toUpperCase()}`)}</description>
${items.map(renderItem).join('')}  </channel>
</rss>`
}