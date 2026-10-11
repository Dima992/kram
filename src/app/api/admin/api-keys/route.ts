import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { API_KEY_SCOPES, createApiKey } from '@/utilities/apiKeys'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

async function authorizeAdmin(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user) {
    return { payload, response: NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 }) }
  }
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return { payload, response: NextResponse.json({ error: 'Недостатньо прав.' }, { status: 403 }) }
  }

  return { payload, response: null }
}

export async function GET(req: Request) {
  const { payload, response } = await authorizeAdmin(req)
  if (response) return response

  const { docs } = await payload.find({
    collection: 'api-keys',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    sort: '-createdAt',
  })

  return NextResponse.json(
    {
      docs: docs.map(({ id, name, scopes, token, createdAt }) => ({
        id,
        name,
        scopes,
        token,
        createdAt,
      })),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        Vary: 'Cookie',
      },
    },
  )
}

export async function POST(req: Request) {
  const { payload, response } = await authorizeAdmin(req)
  if (response) return response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некоректний JSON.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Перевірте назву та права ключа.' }, { status: 400 })
  }

  const { name, scopes } = body as { name?: unknown; scopes?: unknown }
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    !Array.isArray(scopes) ||
    scopes.length === 0 ||
    !scopes.every(
      (scope) =>
        typeof scope === 'string' &&
        API_KEY_SCOPES.some((allowedScope) => allowedScope === scope),
    )
  ) {
    return NextResponse.json({ error: 'Перевірте назву та права ключа.' }, { status: 400 })
  }

  const token = createApiKey()
  const apiKey = await payload.create({
    collection: 'api-keys',
    data: {
      name: name.trim(),
      scopes,
      token,
    },
    overrideAccess: true,
  })

  return NextResponse.json(
    {
      token,
      key: {
        id: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
        token: apiKey.token,
        createdAt: apiKey.createdAt,
      },
    },
    { status: 201 },
  )
}
