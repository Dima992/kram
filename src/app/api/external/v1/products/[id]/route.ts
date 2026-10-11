import configPromise from '@payload-config'
import { authenticateApiKey } from '@/utilities/apiKeys'
import { validateProductWrite } from '@/utilities/externalApi'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!data) return NextResponse.json({ error: 'Перевірте поля товару.' }, { status: 400 })

  const { id } = await params
  const existing = await payload.findByID({
    collection: 'products',
    id,
    overrideAccess: true,
  })
  if (!existing) return NextResponse.json({ error: 'Товар не знайдено.' }, { status: 404 })

  const locale = new URL(req.url).searchParams.get('locale') || 'uk'
  if (locale !== 'uk' && locale !== 'ru') {
    return NextResponse.json({ error: 'Параметр locale має бути uk або ru.' }, { status: 400 })
  }

  const updated = await payload.update({
    collection: 'products',
    id,
    locale,
    overrideAccess: true,
    data,
  })
  return NextResponse.json({ doc: updated })
}
