import { createHash } from 'node:crypto'
import type { ImportSource } from '@/payload-types'
import type { Payload } from 'payload'
import type { SupplierRow } from '@/utilities/parseSupplierFile'
import { supplierColumn } from '@/utilities/parseSupplierFile'
import { mapSupplierProduct } from '@/ai/supplierProductMapper'

const ROWS_PER_JOB = 500
const MAPPING_BATCH_SIZE = 10

type SourceType = 'file' | 'url' | 'telegram'
type ImportJob = {
  id: string
  supplierRef: string | ImportSource
  sourceType: SourceType
  rows: unknown
  nextIndex: number
  failedRows: number
  telegramChannel?: string | null
}

function recordKey(row: SupplierRow): string {
  const values = row.values
  return (
    values._messageid ||
    values._id ||
    values.id ||
    values.sku ||
    values._productkey ||
    String(row.rowNumber)
  )
}

export async function enqueueSupplierRows(
  payload: Payload,
  options: {
    supplierID: string
    sourceType: SourceType
    rows: SupplierRow[]
    telegramChannel?: string
  },
): Promise<{ jobs: number; rows: number }> {
  if (options.rows.length === 0) throw new Error('Джерело не містить товарних записів.')
  let jobs = 0
  for (let start = 0; start < options.rows.length; start += ROWS_PER_JOB) {
    const batch = options.rows.slice(start, start + ROWS_PER_JOB)
    await payload.create({
      collection: 'supplier-import-jobs',
      overrideAccess: true,
      data: {
        supplierRef: options.supplierID,
        sourceType: options.sourceType,
        rows: batch,
        nextIndex: 0,
        totalRows: batch.length,
        failedRows: 0,
        status: 'queued',
        telegramChannel: options.telegramChannel,
      },
    })
    jobs += 1
  }
  return { jobs, rows: options.rows.length }
}

function readValue(values: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = values[key.toLowerCase()]?.trim()
    if (value) return value
  }
  return ''
}

function numberValue(value: string, fallback?: number): number {
  const normalized = value.replace(/[\s\u00a0]/g, '').replace(/[^\d.,+-]/g, '')
  if (!normalized) {
    if (fallback !== undefined) return fallback
    throw new Error('В сирих даних не знайдена ціна товару.')
  }
  const separator = normalized.lastIndexOf(',') > normalized.lastIndexOf('.') ? ',' : '.'
  const parsed = Number(
    separator === ','
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, ''),
  )
  if (!Number.isFinite(parsed)) throw new Error(`Некоректне числове значення «${value}».`)
  return parsed
}

function currencyValue(value: string, fallback: ImportSource['defaultCurrency']): 'UAH' | 'USD' | 'EUR' {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return fallback
  if (['UAH', '₴', 'ГРН', 'ГРИВНЯ'].includes(normalized)) return 'UAH'
  if (['USD', '$', 'ДОЛАР', 'ДОЛЛАР'].includes(normalized)) return 'USD'
  if (['EUR', '€', 'ЄВРО', 'ЕВРО'].includes(normalized)) return 'EUR'
  throw new Error(`Невідома валюта «${value}».`)
}

function rawText(row: SupplierRow): string {
  return Object.entries(row.values)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
    .slice(0, 20_000)
}

async function ingestRow(
  payload: Payload,
  source: ImportSource,
  job: ImportJob,
  row: SupplierRow,
): Promise<void> {
  const normalizedSKU = supplierColumn(row, source.skuColumn)
  const productKey = supplierColumn(row, '_productkey') || supplierColumn(row, '_messageid')
  const image = supplierColumn(row, source.imageColumn)
  const id = createHash('sha256')
    .update(`${source.sourceKey}:${job.sourceType}:${job.telegramChannel || ''}:${recordKey(row)}`)
    .digest('hex')
  const sourceRecordKey = `${job.sourceType}-${id}`
  const prior = await payload.find({
    collection: 'supplier-imports',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { sourceRecordKey: { equals: sourceRecordKey } },
  })
  if (prior.docs.length) return

  const rawPayload = { ...row.values, rowNumber: row.rowNumber }
  const price = numberValue(
    supplierColumn(row, source.priceColumn) || readValue(row.values, ['price', 'amount']),
  )
  if (price <= 0) throw new Error('Ціна має бути більшою за нуль.')
  const inventory = Math.floor(
    numberValue(
      supplierColumn(row, source.inventoryColumn) ||
        readValue(row.values, ['quantity', 'stock', 'inventory', 'available']),
      0,
    ),
  )
  if (inventory < 0) throw new Error('Кількість товару не може бути від’ємною.')
  const currency = currencyValue(
    supplierColumn(row, source.currencyColumn) || readValue(row.values, ['currency']),
    source.defaultCurrency,
  )
  const sku =
    normalizedSKU ||
    productKey ||
    createHash('sha256').update(JSON.stringify(row.values)).digest('hex').slice(0, 20)
  const mapping = await mapSupplierProduct(rawText(row), {
    basePrice: price,
    baseCurrency: currency,
    inventory,
    supplierSKU: sku,
    supplierProductKey: productKey,
    supplierImageURL: image,
    brand: supplierColumn(row, source.brandColumn),
    gtin: supplierColumn(row, source.gtinColumn),
    mpn: supplierColumn(row, source.mpnColumn),
  })

  await payload.create({
    collection: 'supplier-imports',
    overrideAccess: true,
    data: {
      sourceType: job.sourceType,
      supplierRef: source.id,
      sourceRecordKey,
      rawPayload,
      mappedData: mapping,
      mappingStatus: 'completed',
      status: 'pending',
    },
  })
}

export async function processSupplierImportJobs(
  payload: Payload,
  options: { jobLimit?: number; batchSize?: number } = {},
): Promise<{ jobs: number; processed: number; failed: number; pending: number }> {
  const jobLimit = options.jobLimit ?? 5
  const batchSize = Math.min(Math.max(options.batchSize ?? MAPPING_BATCH_SIZE, 1), 25)
  const { docs: jobs } = await payload.find({
    collection: 'supplier-import-jobs',
    depth: 0,
    limit: jobLimit,
    sort: 'createdAt',
    overrideAccess: true,
    where: { status: { in: ['queued', 'processing'] } },
  })

  const result = { jobs: 0, processed: 0, failed: 0, pending: 0 }
  for (const found of jobs) {
    const job = found as unknown as ImportJob
    const supplierID =
      typeof job.supplierRef === 'object' ? job.supplierRef.id : job.supplierRef
    const source = await payload.findByID({
      collection: 'import-sources',
      id: supplierID,
      depth: 0,
      overrideAccess: true,
    })
    const rows = Array.isArray(job.rows) ? (job.rows as SupplierRow[]) : []
    let cursor = Math.min(job.nextIndex || 0, rows.length)
    let failures = job.failedRows || 0

    await payload.update({
      collection: 'supplier-import-jobs',
      id: job.id,
      overrideAccess: true,
      data: { status: 'processing' },
    })

    const end = Math.min(cursor + batchSize, rows.length)
    while (cursor < end) {
      try {
        await ingestRow(payload, source, job, rows[cursor]!)
        result.processed += 1
      } catch (error) {
        failures += 1
        result.failed += 1
        const row = rows[cursor]!
        const sourceRecordKey = `${job.sourceType}-${createHash('sha256')
          .update(`${source.sourceKey}:${job.sourceType}:${job.telegramChannel || ''}:${recordKey(row)}`)
          .digest('hex')}`
        const prior = await payload.find({
          collection: 'supplier-imports',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          where: { sourceRecordKey: { equals: sourceRecordKey } },
        })
        if (prior.docs.length === 0) {
          await payload.create({
            collection: 'supplier-imports',
            overrideAccess: true,
            data: {
              sourceType: job.sourceType,
              supplierRef: source.id,
              sourceRecordKey,
              rawPayload: { ...row.values, rowNumber: row.rowNumber },
              mappingStatus: 'failed',
              mappingError: error instanceof Error ? error.message.slice(0, 2000) : 'Помилка маппінгу.',
              status: 'pending',
            },
          })
        }
        payload.logger.error({ err: error, msg: `Не вдалося обробити рядок ${row.rowNumber} імпорту` })
      }

      cursor += 1
      await payload.update({
        collection: 'supplier-import-jobs',
        id: job.id,
        overrideAccess: true,
        data: { nextIndex: cursor, failedRows: failures },
      })
    }

    const complete = cursor >= rows.length
    await payload.update({
      collection: 'supplier-import-jobs',
      id: job.id,
      overrideAccess: true,
      data: { status: complete ? 'completed' : 'processing' },
    })
    result.jobs += 1
    if (!complete) result.pending += 1
  }

  return result
}

export async function markMissingTelegramProductsUnavailable(
  payload: Payload,
  supplierID: string,
  channel: string,
  removedMessageIDs: string[],
): Promise<number> {
  const source = await payload.findByID({
    collection: 'import-sources',
    id: supplierID,
    depth: 0,
    overrideAccess: true,
  })
  const removed = new Set(removedMessageIDs)
  if (removed.size === 0) return 0
  let changed = 0
  let page = 1
  let hasNextPage = true
  while (hasNextPage) {
    const imports = await payload.find({
      collection: 'supplier-imports',
      depth: 0,
      limit: 250,
      page,
      overrideAccess: true,
      where: {
        and: [
          { supplierRef: { equals: supplierID } },
          { sourceType: { equals: 'telegram' } },
          { status: { equals: 'approved' } },
        ],
      },
    })
    for (const item of imports.docs) {
      const raw = item.rawPayload
      if (!raw || typeof raw !== 'object') continue
      const sourceMessageID =
        'messageId' in raw ? raw.messageId : '_messageid' in raw ? raw._messageid : undefined
      const sourceChannel = '_channel' in raw ? raw._channel : 'channel' in raw ? raw.channel : undefined
      if (
        sourceMessageID === undefined ||
        String(sourceChannel) !== channel ||
        !removed.has(String(sourceMessageID)) ||
        !item.product
      ) {
        continue
      }
      const productID = typeof item.product === 'object' ? item.product.id : item.product
      await payload.update({
        collection: 'products',
        id: productID,
        overrideAccess: true,
        data: { inventory: 0 },
      })
      changed += 1
    }
    hasNextPage = imports.hasNextPage
    page += 1
  }
  payload.logger.info({
    msg: `Telegram-канал постачальника ${source.name}: відсутніх товарів позначено як немає в наявності — ${changed}`,
  })
  return changed
}

export async function enqueueTelegramPosts(
  payload: Payload,
  options: {
    supplierID: string
    channel: string
    posts: Array<{ messageId: string | number; date: string; text: string; [key: string]: unknown }>
    since?: string
  },
): Promise<{ jobs: number; rows: number }> {
  const sinceTime = options.since ? new Date(options.since).getTime() : Number.NEGATIVE_INFINITY
  if (!Number.isFinite(sinceTime) && options.since) {
    throw new Error('Вкажіть коректну дату початку імпорту Telegram.')
  }
  const rows = options.posts
    .filter((post) => {
      const postTime = new Date(post.date).getTime()
      if (!Number.isFinite(postTime)) throw new Error(`Некоректна дата Telegram-повідомлення ${post.messageId}.`)
      return postTime >= sinceTime
    })
    .map((post, index) => ({
      rowNumber: index + 1,
      values: {
        _messageid: String(post.messageId),
        id: String(post.messageId),
        sku: String(post.messageId),
        title: typeof post.title === 'string' ? post.title : '',
        description: post.text,
        price: String(post.price ?? ''),
        currency: String(post.currency ?? ''),
        stock: String(post.inventory ?? 1),
        image: String(post.image ?? ''),
        brand: String(post.brand ?? ''),
        gtin: String(post.gtin ?? ''),
        mpn: String(post.mpn ?? ''),
        date: post.date,
        _channel: options.channel,
      },
    }))

  if (options.posts.length > 5000) {
    throw new Error('За один запуск Telegram-імпорту можна обробити не більше 5 000 постів.')
  }
  if (rows.length === 0) return { jobs: 0, rows: 0 }
  return enqueueSupplierRows(payload, {
    supplierID: options.supplierID,
    sourceType: 'telegram',
    rows,
    telegramChannel: options.channel,
  })
}
