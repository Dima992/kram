import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import type { Product } from '@/payload-types'
import ExcelJS from 'exceljs'
import { getPayload, type Payload } from 'payload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function plainText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const parts: string[] = []

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') parts.push(record.text)
    if (record.root) visit(record.root)
    if (record.children) visit(record.children)
  }

  visit(value)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

async function findAllProducts(
  payload: Payload,
  locale: 'uk' | 'ru',
): Promise<Product[]> {
  const products: Product[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      draft: true,
      limit: 500,
      locale,
      overrideAccess: true,
      page,
      sort: 'createdAt',
    })
    products.push(...result.docs)
    hasNextPage = result.hasNextPage
    page += 1
  }

  return products
}

export async function GET(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 })
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return NextResponse.json({ error: 'Недостатньо прав для експорту товарів.' }, { status: 403 })
  }

  try {
    const [ukProducts, ruProducts] = await Promise.all([
      findAllProducts(payload, 'uk'),
      findAllProducts(payload, 'ru'),
    ])
    const russianByID = new Map(ruProducts.map((product) => [product.id, product]))
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Store catalog export'
    const sheet = workbook.addWorksheet('Products', { views: [{ state: 'frozen', ySplit: 1 }] })

    sheet.columns = [
      { header: 'product_id', key: 'id', width: 24 },
      { header: 'sku', key: 'sku', width: 22 },
      { header: 'title', key: 'title', width: 36 },
      { header: 'description', key: 'description', width: 48 },
      { header: 'price', key: 'price', width: 14 },
      { header: 'currency', key: 'currency', width: 14 },
      { header: 'stock', key: 'stock', width: 12 },
      { header: 'image', key: 'image', width: 48 },
      { header: 'brand', key: 'brand', width: 24 },
      { header: 'gtin', key: 'gtin', width: 22 },
      { header: 'mpn', key: 'mpn', width: 22 },
      { header: 'category', key: 'category', width: 32 },
      { header: 'supplier', key: 'supplierName', width: 24 },
      { header: 'supplier_sku', key: 'supplierSKU', width: 22 },
      { header: 'title_uk', key: 'titleUk', width: 36 },
      { header: 'title_ru', key: 'titleRu', width: 36 },
      { header: 'description_uk', key: 'descriptionUk', width: 48 },
      { header: 'description_ru', key: 'descriptionRu', width: 48 },
      { header: 'price_uah', key: 'priceInUAH', width: 14 },
      { header: 'slug', key: 'slug', width: 30 },
      { header: 'categories_uk', key: 'categories', width: 32 },
      { header: 'image_url', key: 'imageURL', width: 48 },
      { header: 'status', key: 'status', width: 14 },
    ]
    sheet.autoFilter = { from: 'A1', to: 'W1' }
    sheet.getRow(1).font = { bold: true }

    for (const product of ukProducts) {
      const russian = russianByID.get(product.id) || product
      const categories = (product.categories || [])
        .filter((category) => typeof category === 'object')
        .map((category) => (typeof category === 'object' ? category.title : ''))
        .filter(Boolean)
      const image = product.gallery?.find((item) => typeof item.image === 'object')?.image
      const imageURL = image && typeof image === 'object' ? image.url || '' : ''
      const categoryNames = categories.join(', ')

      sheet.addRow({
        id: product.id,
        sku: product.supplierSKU || product.mpn || product.id,
        title: product.title,
        description: plainText(product.description),
        price: product.basePrice,
        currency: product.baseCurrency || 'UAH',
        stock: product.inventory ?? 0,
        image: imageURL,
        category: categoryNames,
        supplierName: product.supplierName || '',
        supplierSKU: product.supplierSKU || '',
        titleUk: product.title,
        titleRu: russian.title,
        descriptionUk: plainText(product.description),
        descriptionRu: plainText(russian.description),
        priceInUAH: product.priceInUAH ?? '',
        slug: product.slug,
        categories: categoryNames,
        imageURL,
        status: product._status || 'draft',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="catalog-export.xlsx"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Помилка експорту каталогу' })
    return NextResponse.json(
      { error: 'Не вдалося створити Excel-файл каталогу.' },
      { status: 500 },
    )
  }
}
