import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { ImportSource } from '@/payload-types'

const MAX_SUPPLIER_FILE_SIZE = 10 * 1024 * 1024
const SUPPORTED_FILE_TYPES = new Set(['.xlsx', '.csv', '.tsv', '.txt', '.xml', '.json'])

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
      normalized.startsWith('feb')
    )
  }

  return true
}

async function assertPublicURL(url: URL): Promise<void> {
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Посилання на прайс має бути HTTPS і не містити логін чи пароль у URL.')
  }
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new Error('Посилання на внутрішній сервер використовувати не можна.')
  }

  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Посилання на прайс веде на недоступний або внутрішній сервер.')
  }
}

function getFileExtension(url: URL, contentType: string | null): string {
  const pathnameExtension = url.pathname.match(/\.(xlsx|csv|tsv|txt|xml|json)$/i)?.[0]?.toLowerCase()
  if (pathnameExtension) return pathnameExtension

  switch (contentType?.split(';')[0].trim().toLowerCase()) {
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '.xlsx'
    case 'text/csv':
      return '.csv'
    case 'text/tab-separated-values':
      return '.tsv'
    case 'application/xml':
    case 'text/xml':
    case 'application/atom+xml':
    case 'application/rss+xml':
      return '.xml'
    case 'application/json':
    case 'text/json':
      return '.json'
    default:
      throw new Error('Посилання має вести на XLSX, CSV, TSV, XML або JSON-файл.')
  }
}

export async function downloadSupplierFile(
  source: ImportSource,
  options: { url?: string } = {},
): Promise<{ buffer: Buffer; fileName: string }> {
  const sourceURL = options.url?.trim() || source.supplierFeedURL
  if (!sourceURL) {
    throw new Error('У профілі постачальника не вказане посилання на прайс.')
  }

  let url = new URL(sourceURL)
  const headers = new Headers()
  if (!options.url && source.supplierBearerToken) {
    headers.set('Authorization', `Bearer ${source.supplierBearerToken}`)
  } else if (!options.url && (source.supplierUsername || source.supplierPassword)) {
    const credentials = Buffer.from(
      `${source.supplierUsername || ''}:${source.supplierPassword || ''}`,
    ).toString('base64')
    headers.set('Authorization', `Basic ${credentials}`)
  }

  let response: Response | undefined
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicURL(url)
    response = await fetch(url, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    })
    if (response.status < 300 || response.status >= 400) break

    const location = response.headers.get('location')
    if (!location || redirects === 3) {
      throw new Error('Забагато перенаправлень під час завантаження прайсу.')
    }
    url = new URL(location, url)
  }

  if (!response) throw new Error('Не вдалося завантажити прайс постачальника.')
  if (!response.ok) {
    throw new Error(`Постачальник повернув помилку HTTP ${response.status}.`)
  }

  const contentType = response.headers.get('content-type')
  const extension = getFileExtension(url, contentType)
  if (!SUPPORTED_FILE_TYPES.has(extension)) {
    throw new Error('Підтримуються тільки XLSX, CSV, TSV, TXT, XML або JSON-файли.')
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_SUPPLIER_FILE_SIZE) {
    throw new Error('Файл прайсу більший за дозволені 10 МБ.')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Постачальник повернув порожній файл.')

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_SUPPLIER_FILE_SIZE) {
      await reader.cancel()
      throw new Error('Файл прайсу більший за дозволені 10 МБ.')
    }
    chunks.push(value)
  }

  if (totalBytes === 0) throw new Error('Постачальник повернув порожній файл.')

  const requestedName = decodeURIComponent(url.pathname.split('/').pop() || 'supplier-price')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.(xlsx|csv|tsv|txt|xml|json)$/i, '')
  return {
    buffer: Buffer.concat(chunks),
    fileName: `${requestedName || 'supplier-price'}${extension}`,
  }
}
