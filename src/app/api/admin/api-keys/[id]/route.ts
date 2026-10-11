import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user) return NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 })
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return NextResponse.json({ error: 'Недостатньо прав.' }, { status: 403 })
  }

  const { id } = await params
  const { docs } = await payload.find({
    collection: 'api-keys',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { id: { equals: id } },
  })
  if (!docs.length) return NextResponse.json({ error: 'API-ключ не знайдено.' }, { status: 404 })

  await payload.delete({
    collection: 'api-keys',
    id,
    overrideAccess: true,
  })
  return new NextResponse(null, { status: 204 })
}
