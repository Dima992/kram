import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

export type SupplierRow = {
  rowNumber: number
  values: Record<string, string>
}

export type SupplierLocale = 'uk' | 'ru'

const MAX_IMPORT_ROWS = 5000

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]

    if (character === '"') {
      if (quoted && next === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (!quoted && character === delimiter) {
      row.push(value)
      value = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (quoted) throw new Error('У CSV-файлі є незакрите поле в лапках.')
  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)

  return rows
}

function detectDelimiter(headerLine: string): string {
  const candidates = [',', ';', '\t']
  return candidates
    .map((delimiter) => ({
      delimiter,
      columns: parseDelimited(headerLine, delimiter)[0]?.length || 0,
    }))
    .sort((left, right) => right.columns - left.columns)[0]?.delimiter || ','
}

function decodeXMLText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(
      /&(amp|lt|gt|quot|apos|mdash|ndash|bull|hellip|copy|reg|trade|euro|nbsp|laquo|raquo|rsquo|lsquo|ldquo|rdquo|#\d+|#x[\da-f]+);/gi,
      (_entity, name: string) => {
      switch (name.toLowerCase()) {
        case 'amp':
          return '&'
        case 'lt':
          return '<'
        case 'gt':
          return '>'
        case 'quot':
          return '"'
        case 'apos':
          return "'"
        case 'mdash':
          return '—'
        case 'ndash':
          return '–'
        case 'bull':
          return '•'
        case 'hellip':
          return '…'
        case 'copy':
          return '©'
        case 'reg':
          return '®'
        case 'trade':
          return '™'
        case 'euro':
          return '€'
        case 'nbsp':
          return ' '
        case 'laquo':
          return '«'
        case 'raquo':
          return '»'
        case 'rsquo':
          return '’'
        case 'lsquo':
          return '‘'
        case 'ldquo':
          return '“'
        case 'rdquo':
          return '”'
        default: {
          const codePoint = name[1]?.toLowerCase() === 'x'
            ? Number.parseInt(name.slice(2), 16)
            : Number.parseInt(name.slice(1), 10)
          if (
            !Number.isInteger(codePoint) ||
            codePoint <= 0 ||
            codePoint > 0x10ffff ||
            (codePoint >= 0xd800 && codePoint <= 0xdfff)
          ) {
            throw new Error('У XML-фіді є некоректний символ.')
          }
          return String.fromCodePoint(codePoint)
        }
      }
      },
    )
}

function merchantField(item: string, field: string): string {
  const tag = new RegExp(
    `<(?:[\\w.-]+:)?${field}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${field}\\s*>`,
    'i',
  )
  const value = item.match(tag)?.[1]
  if (!value) return ''

  const decoded = decodeXMLText(value).trim()
  return field === 'description' ? decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : decoded
}

function merchantProductKey(link: string): string {
  if (!link) return ''

  try {
    const url = new URL(link)
    const path = url.pathname.replace(/^\/ua(?=\/|$)/i, '').replace(/\/+$/, '')
    const productID = path.match(/\/(p\d+)/i)?.[1]
    const legacyProductID = url.searchParams.get('product_id')?.match(/^\d+$/)?.[0]
    const canonicalProductID = productID || (legacyProductID ? `p${legacyProductID}` : '')
    return `${url.origin}${canonicalProductID ? `/${canonicalProductID.toLowerCase()}` : path.toLowerCase()}`
  } catch {
    return ''
  }
}

function merchantLocale(item: string, link: string, atom: boolean): SupplierLocale | '' {
  if (!atom) return ''

  const language = item.match(/\bxml:lang\s*=\s*["'](uk|ua|ru|ru-[a-z]+)["']/i)?.[1]
  if (/^(uk|ua)/i.test(language || '')) return 'uk'
  if (language) return 'ru'

  try {
    const path = new URL(link).pathname
    if (/\/(?:ua|uk)(?:\/|$)/i.test(path)) return 'uk'
    if (/\/ru(?:\/|$)/i.test(path)) return 'ru'
  } catch {
    // Fall back to the language markers in the product text.
  }

  const text = `${merchantField(item, 'title')} ${merchantField(item, 'description')}`
  const ukrainianMarkers = text.match(/[іїєґ]/gi)?.length || 0
  const russianMarkers = text.match(/[ёыэъ]/gi)?.length || 0
  if (ukrainianMarkers > russianMarkers) return 'uk'
  if (russianMarkers > ukrainianMarkers) return 'ru'

  return link ? 'ru' : ''
}

function parseMerchantFeed(buffer: Buffer): SupplierRow[] {
  const xml = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '')
  if (!/<(?:[\w.-]+:)?rss\b/i.test(xml) && !/<(?:[\w.-]+:)?feed\b/i.test(xml)) {
    throw new Error('XML-файл не схожий на фід Google Merchant.')
  }

  const items = [
    ...[...xml.matchAll(/<(?:[\w.-]+:)?entry\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?entry\s*>/gi)].map(
      (match) => ({ match, atom: true }),
    ),
    ...[...xml.matchAll(/<(?:[\w.-]+:)?item\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?item\s*>/gi)].map(
      (match) => ({ match, atom: false }),
    ),
  ].sort((left, right) => left.match.index - right.match.index)
  if (items.length === 0) {
    throw new Error('У XML-фіді Google Merchant не знайдено товарів.')
  }
  if (items.length > MAX_IMPORT_ROWS) {
    throw new Error(`За один раз можна завантажити не більше ${MAX_IMPORT_ROWS} товарів.`)
  }

  return items.map(({ match, atom }, index) => {
    const item = match[1] || ''
    const rawPrice = merchantField(item, 'price')
    const price = rawPrice.match(/^\s*([\d][\d.,\s]*)\s+([A-Za-z]{3})\s*$/)
    const link = merchantField(item, 'link')
    const locale = merchantLocale(item, link, atom)
    const googleCategory = merchantField(item, 'google_product_category')

    return {
      rowNumber: index + 1,
      values: {
        sku: merchantField(item, 'id'),
        _locale: locale,
        _productkey: merchantProductKey(link),
        title: merchantField(item, 'title'),
        description: merchantField(item, 'description'),
        price: price?.[1]?.trim() || rawPrice,
        currency: price?.[2]?.toUpperCase() || '',
        stock:
          merchantField(item, 'quantity') ||
          (['in_stock', 'preorder', 'backorder'].includes(
            merchantField(item, 'availability').toLowerCase().replace(/[\s-]+/g, '_'),
          )
            ? '1'
            : '0'),
        image: merchantField(item, 'image_link'),
        brand: merchantField(item, 'brand'),
        gtin: merchantField(item, 'gtin'),
        mpn: merchantField(item, 'mpn'),
        category:
          merchantField(item, 'product_type') ||
          (/^\d+$/.test(googleCategory) ? '' : googleCategory),
      },
    }
  })
}

export async function parseSupplierFile(
  fileName: string,
  buffer: Buffer,
  delimiter: string | null | undefined,
  encoding: string | null | undefined,
): Promise<SupplierRow[]> {
  let rows: unknown[][]

  if (/\.xml$/i.test(fileName)) {
    return parseMerchantFeed(buffer)
  }

  if (/\.xlsx$/i.test(fileName)) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.read(Readable.from([buffer]))
    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('В Excel-файлі немає аркушів.')

    rows = []
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      rows.push(
        Array.from({ length: worksheet.columnCount }, (_, index) => {
          const cellValue = row.getCell(index + 1).value
          if (cellValue === null || cellValue === undefined) return ''
          if (typeof cellValue === 'object' && 'text' in cellValue) return cellValue.text
          if (typeof cellValue === 'object' && 'result' in cellValue) return cellValue.result
          return cellValue
        }),
      )
    })
  } else if (/\.(csv|tsv|txt)$/i.test(fileName)) {
    const text = new TextDecoder(encoding || 'utf-8').decode(buffer).replace(/^\uFEFF/, '')
    const firstLine = text.split(/\r?\n/, 1)[0] || ''
    const separator =
      delimiter && delimiter !== 'auto'
        ? delimiter
        : /\.tsv$/i.test(fileName)
          ? '\t'
          : detectDelimiter(firstLine)

    rows = parseDelimited(text, separator)
  } else {
    throw new Error('Підтримуються файли .xlsx, .csv, .tsv, .txt або XML-фід Google Merchant.')
  }

  if (rows.length < 2) throw new Error('У файлі мають бути заголовки та хоча б один рядок товару.')
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`За один раз можна завантажити не більше ${MAX_IMPORT_ROWS} товарів.`)
  }

  const headers = rows[0].map((value) => String(value ?? '').trim())
  if (headers.some((header) => !header)) {
    throw new Error('У першому рядку знайдено порожній заголовок колонки.')
  }
  if (new Set(headers.map((header) => header.toLocaleLowerCase())).size !== headers.length) {
    throw new Error('У файлі є однакові заголовки колонок. Перейменуйте їх і спробуйте знову.')
  }

  return rows.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(
      headers.map((header, columnIndex) => [header.toLocaleLowerCase(), String(cells[columnIndex] ?? '').trim()]),
    ),
  }))
}

export function supplierColumn(row: SupplierRow, column: string | null | undefined): string {
  return column ? row.values[column.trim().toLocaleLowerCase()] || '' : ''
}
