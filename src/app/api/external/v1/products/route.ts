import configPromise from '@payload-config'
import { authenticateApiKey } from '@/utilities/apiKeys'
import { validateProductWrite } from '@/utilities/externalApi'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

function paginationValue(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

function readLocale(req: Request): 'uk' | 'ru' | null {
  const locale = new URL(req.url).searchParams.get('locale') || 'uk'
  return locale === 'uk' || locale === 'ru' ? locale : null
}

export async function GET(req: Request) {
  const payload = await getPayload({ config: configPromise })
  if (!(await authenticateApiKey(payload, req.headers, 'products:read'))) {
    return NextResponse.json({ error: 'Недійсний ключ або недостатньо прав.' }, { status: 401 })
  }

  const locale = readLocale(req)
  if (!locale) {
    return NextResponse.json({ error: 'Параметр locale має бути uk або ru.' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = paginationValue(url.searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER)
  const limit = paginationValue(url.searchParams.get('limit'), 50, 100)
  const result = await payload.find({
    collection: 'products',
    depth: 0,
    limit,
    locale,
    page,
    overrideAccess: true,
    sort: '-updatedAt',
    where: { _status: { equals: 'published' } },
    select: {
      id: true,
      title: true,
      slug: true,
      basePrice: true,
      baseCurrency: true,
      priceInUAH: true,
      inventory: true,
      supplierSKU: true,
      gtin: true,
      mpn: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
    },
  })
}

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  if (!(await authenticateApiKey(payload, req.headers, 'products:write'))) {
    return NextResponse.json({ error: 'Недійсний ключ або недостатньо прав.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некоректний JSON.' }, { status: 400 })
  }

  const data = validateProductWrite(body)
  if (!data || typeof data.title !== 'string' || typeof data.slug !== 'string' || typeof data.basePrice !== 'number') {
    return NextResponse.json(
      { error: 'Для створення товару потрібні назва, slug і ціна.' },
      { status: 400 },
    )
  }

  const locale = readLocale(req)
  if (!locale) {
    return NextResponse.json({ error: 'Параметр locale має бути uk або ru.' }, { status: 400 })
  }

  const product = await payload.create({
    collection: 'products',
    locale,
    overrideAccess: true,
    data: {
      ...data,
      title: data.title,
      slug: data.slug,
      basePrice: data.basePrice,
    },
  })
  return NextResponse.json({ doc: product }, { status: 201 })
}
