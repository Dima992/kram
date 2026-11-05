import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { syncVariants } from '@/utilities/variantSync'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ error: 'Увійдіть в адмінку' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const productId = typeof body?.productId === 'string' ? body.productId : ''
  if (!productId) {
    return Response.json({ error: 'Не вказано товар' }, { status: 400 })
  }

  try {
    const result = await syncVariants(payload, productId)
    if (result.status === 'skipped') {
      return Response.json({ error: result.reason }, { status: 400 })
    }
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'невідома помилка'
    return Response.json({ error: `Помилка: ${message}` }, { status: 500 })
  }
}