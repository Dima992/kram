import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import type { Category, ImportSource, Product } from '@/payload-types'
import type { RequiredDataFromCollectionSlug } from 'payload'
import {
  parseSupplierFile,
  supplierColumn,
  type SupplierLocale,
  type SupplierRow,
} from '@/utilities/parseSupplierFile'
import { getPayload, type Payload } from 'payload'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { createHash } from 'node:crypto'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type ValidRow = {
  rowNumber: number
  locale?: SupplierLocale
  sku: string
  productKey: string
  title: string
  description: string
  price: number
  currency: 'UAH' | 'USD' | 'EUR'
  inventory: number
  imageURL: string
  brand: string
  gtin: string
  mpn: string
  category: string
}

type RowError = { row: number; error: string }

function parseNumber(value: string): number | undefined {
  const cleaned = value.replace(/[\s\u00a0]/g, '').replace(/[^\d.,+-]/g, '')
  if (!cleaned) return undefined

  const decimalSeparator =
    cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
  const normalized =
    decimalSeparator === ','
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseCurrency(value: string, fallback: ImportSource['defaultCurrency']): ValidRow['currency'] {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return fallback
  if (['UAH', '₴', 'ГРН', 'ГРИВНЯ'].includes(normalized)) return 'UAH'
  if (['USD', '$', 'ДОЛАР', 'ДОЛЛАР'].includes(normalized)) return 'USD'
  if (['EUR', '€', 'ЄВРО', 'ЕВРО'].includes(normalized)) return 'EUR'
  throw new Error(`Невідома валюта «${value}». Використовуйте UAH, USD або EUR.`)
}

function toRichText(text: string): NonNullable<Product['description']> {
  return {
    root: {
      type: 'root',
      children: text
        ? [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text,
                  version: 1,
                },
              ],
              direction: null,
              format: '' as const,
              indent: 0,
              version: 1,
            },
          ]
        : [],
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

function validateRow(row: SupplierRow, source: ImportSource): ValidRow {
  const locale = supplierColumn(row, '_locale')
  const sku = supplierColumn(row, source.skuColumn)
  const title = supplierColumn(row, source.titleColumn)
  const rawPrice = supplierColumn(row, source.priceColumn)
  const price = parseNumber(rawPrice)
  const rawInventory = supplierColumn(row, source.inventoryColumn)
  const inventory = rawInventory ? parseNumber(rawInventory) : 0

  if (!sku) throw new Error(`Не заповнений артикул у колонці «${source.skuColumn}».`)
  if (!title) throw new Error(`Не заповнена назва у колонці «${source.titleColumn}».`)
  if (price === undefined || price <= 0) {
    throw new Error(`Некоректна ціна «${rawPrice}» у колонці «${source.priceColumn}».`)
  }
  if (inventory === undefined || inventory < 0) {
    throw new Error('Кількість на складі має бути числом не менше нуля.')
  }

  const rawCurrency = supplierColumn(row, source.currencyColumn)

  return {
    rowNumber: row.rowNumber,
    locale: locale === 'uk' || locale === 'ru' ? locale : undefined,
    sku,
    productKey: supplierColumn(row, '_productkey'),
    title,
    description: supplierColumn(row, source.descriptionColumn),
    price,
    currency: parseCurrency(rawCurrency, source.defaultCurrency),
    inventory: Math.floor(inventory),
    imageURL: supplierColumn(row, source.imageColumn),
    brand: supplierColumn(row, source.brandColumn),
    gtin: supplierColumn(row, source.gtinColumn),
    mpn: supplierColumn(row, source.mpnColumn),
    category: supplierColumn(row, source.categoryColumn),
  }
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const [first = 0, second = 0] = address.split('.').map(Number)
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127) ||
      first >= 224
    )
  }

  if (version === 6) {
    const normalized = address.toLowerCase()
    if (normalized.startsWith('::ffff:')) {
      return isPrivateAddress(normalized.slice('::ffff:'.length))
    }

    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.')
    )
  }

  return true
}

async function assertPublicImageHost(url: URL): Promise<void> {
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Посилання на зображення має бути безпечним HTTPS-посиланням.')
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Посилання на зображення веде на недоступний або внутрішній сервер.')
  }
}

async function downloadImage(imageURL: string): Promise<{
  buffer: Buffer
  contentType: string
  fileName: string
} | null> {
  if (!imageURL) return null

  let url = new URL(imageURL)
  let response: Response | undefined
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicImageHost(url)
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })
    if (response.status < 300 || response.status >= 400) break
    const location = response.headers.get('location')
    if (!location || redirects === 3) {
      throw new Error('Занадто багато перенаправлень під час завантаження зображення.')
    }
    url = new URL(location, url)
  }
  if (!response) throw new Error('Не вдалося завантажити зображення.')
  if (!response.ok) throw new Error(`Не вдалося завантажити зображення (HTTP ${response.status}).`)

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (!contentType || !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(contentType)) {
    throw new Error('Посилання постачальника не веде на підтримуване зображення.')
  }

  const maxImageBytes = 8 * 1024 * 1024
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > maxImageBytes) {
    throw new Error('Розмір зображення має бути не більше 8 МБ.')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Не вдалося прочитати файл зображення.')

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxImageBytes) {
      await reader.cancel()
      throw new Error('Розмір зображення має бути не більше 8 МБ.')
    }
    chunks.push(value)
  }
  if (totalBytes === 0) throw new Error('Файл зображення порожній.')
  const buffer = Buffer.concat(chunks)

  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const fileName = `supplier-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  return { buffer, contentType, fileName }
}

async function getExistingProduct(
  payload: Payload,
  sourceKey: string,
  sku: string,
  productKey: string,
): Promise<Product | undefined> {
  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { supplierSourceKey: { equals: sourceKey } },
        {
          or: [
            { supplierSKU: { equals: sku } },
            ...(productKey ? [{ supplierProductKey: { equals: productKey } }] : []),
          ],
        },
      ],
    },
  })

  return docs[0]
}

async function getOrCreateCategory(
  payload: Payload,
  name: string,
  cache: Map<string, Category>,
): Promise<Category | undefined> {
  const title = name.trim()
  if (!title) return undefined

  const cacheKey = title.toLocaleLowerCase()
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const found = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 1,
    locale: 'uk',
    overrideAccess: true,
    where: { title: { equals: title } },
  })
  if (found.docs[0]) {
    cache.set(cacheKey, found.docs[0])
    return found.docs[0]
  }

  const slugSuffix = createHash('sha256').update(cacheKey).digest('hex').slice(0, 16)
  const category = await payload.create({
    collection: 'categories',
    locale: 'uk',
    overrideAccess: true,
    data: { title, slug: `supplier-${slugSuffix}` },
  })
  await payload.update({
    collection: 'categories',
    id: category.id,
    locale: 'ru',
    overrideAccess: true,
    data: { title },
  })
  cache.set(cacheKey, category)
  return category
}

async function createMedia(payload: Payload, row: ValidRow): Promise<string | undefined> {
  const image = await downloadImage(row.imageURL)
  if (!image) return undefined

  const media = await payload.create({
    collection: 'media',
    locale: 'uk',
    overrideAccess: true,
    data: { alt: row.title },
    file: {
      data: image.buffer,
      mimetype: image.contentType,
      name: image.fileName,
      size: image.buffer.length,
    },
  })
  await payload.update({
    collection: 'media',
    id: media.id,
    locale: 'ru',
    overrideAccess: true,
    data: { alt: row.title },
  })

  return media.id
}

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const cronSecret = process.env.CRON_SECRET
  const suppliedSecret = req.headers.get('x-supplier-import-secret')
  const isInternalImport = Boolean(
    cronSecret &&
      suppliedSecret &&
      Buffer.byteLength(cronSecret) === Buffer.byteLength(suppliedSecret) &&
      timingSafeEqual(Buffer.from(cronSecret), Buffer.from(suppliedSecret)),
  )

  if (!isInternalImport) {
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 })
    if (user.collection !== 'users' || !checkRole(['admin'], user)) {
      return NextResponse.json({ error: 'Недостатньо прав для імпорту товарів.' }, { status: 403 })
    }
  }

  try {
    const formData = await req.formData()
    const upload = formData.get('file')
    const sourceID = formData.get('sourceID')
    const dryRun = formData.get('dryRun') === 'true'

    if (!(upload instanceof File)) {
      return NextResponse.json({ error: 'Виберіть файл для імпорту.' }, { status: 400 })
    }
    const maxUploadSize = isInternalImport ? 10 : 4
    if (upload.size === 0 || upload.size > maxUploadSize * 1024 * 1024) {
      return NextResponse.json(
        { error: `Розмір файлу має бути від 1 байта до ${maxUploadSize} МБ.` },
        { status: 400 },
      )
    }
    if (typeof sourceID !== 'string' || !sourceID) {
      return NextResponse.json({ error: 'Виберіть профіль постачальника.' }, { status: 400 })
    }

    const source = await payload.findByID({
      collection: 'import-sources',
      id: sourceID,
      overrideAccess: true,
    })
    const rows = await parseSupplierFile(
      upload.name,
      Buffer.from(await upload.arrayBuffer()),
      source.delimiter,
      source.encoding,
    )

    const result = { total: rows.length, created: 0, updated: 0, errors: [] as RowError[] }
    const validatedRows: ValidRow[] = []
    const categoryCache = new Map<string, Category>()

    for (const row of rows) {
      try {
        validatedRows.push(validateRow(row, source))
      } catch (error) {
        result.errors.push({
          row: row.rowNumber,
          error: error instanceof Error ? error.message : 'Некоректні дані.',
        })
      }
    }

    if (dryRun) {
      return NextResponse.json({
        ...result,
        valid: validatedRows.length,
        preview: validatedRows.slice(0, 5).map(({ sku, title, price, currency }) => ({
          sku,
          title,
          price,
          currency,
        })),
      })
    }

    if (result.errors.length > 0) {
      return NextResponse.json({
        ...result,
        error: 'Спочатку виправте рядки з помилками та перевірте файл повторно.',
        valid: validatedRows.length,
      }, { status: 422 })
    }

    for (const row of validatedRows) {
      try {
        const existing = await getExistingProduct(
          payload,
          source.sourceKey,
          row.sku,
          row.productKey,
        )
        const category = await getOrCreateCategory(payload, row.category, categoryCache)
        let imageID: string | undefined
        if (row.imageURL && row.imageURL !== existing?.supplierImageURL) {
          try {
            imageID = await createMedia(payload, row)
          } catch (error) {
            result.errors.push({
              row: row.rowNumber,
              error: `Товар буде імпортовано без нового фото: ${error instanceof Error ? error.message : 'помилка завантаження'}`,
            })
          }
        }

        const data = {
          baseCurrency: row.currency,
          basePrice: row.price,
          brand: row.brand || undefined,
          description: toRichText(row.description),
          gtin: row.gtin || undefined,
          inventory: row.inventory,
          mpn: row.mpn || row.sku,
          priceInUAH: row.currency === 'UAH' ? row.price : undefined,
          slug:
            existing?.slug ||
            `supplier-${source.sourceKey.slice(-8)}-${createHash('sha256')
              .update(row.sku)
              .digest('hex')
              .slice(0, 16)}`,
          supplierSKU: existing?.supplierSKU || row.sku,
          supplierProductKey: row.productKey || existing?.supplierProductKey || undefined,
          supplierName: source.name,
          supplierSourceKey: source.sourceKey,
          supplierImageURL: row.imageURL || undefined,
          title: row.title,
          _status: existing?._status || (source.publishImportedProducts ? 'published' : 'draft'),
          ...(imageID ? { gallery: [{ image: imageID }] } : {}),
          ...(category ? { categories: [category.id] } : {}),
        } satisfies RequiredDataFromCollectionSlug<'products'>

        let productID: string
        if (existing) {
          const updated = await payload.update({
            collection: 'products',
            id: existing.id,
            locale: row.locale || 'uk',
            overrideAccess: true,
            data,
          })
          productID = updated.id
          result.updated += 1
        } else {
          const created = await payload.create({
            collection: 'products',
            locale: row.locale || 'uk',
            overrideAccess: true,
            data,
          })
          productID = created.id
          result.created += 1
        }

        if (!row.locale) {
          await payload.update({
            collection: 'products',
            id: productID,
            locale: 'ru',
            overrideAccess: true,
            data: {
              title: row.title,
              description: toRichText(row.description),
            },
          })
        }
      } catch (error) {
        result.errors.push({
          row: row.rowNumber,
          error: error instanceof Error ? error.message : 'Не вдалося зберегти товар.',
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Помилка імпорту товарів' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося обробити файл.' },
      { status: 400 },
    )
  }
}
