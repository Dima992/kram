import { createHash, randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

export const API_KEY_SCOPES = [
  'orders:read',
  'orders:write',
  'products:read',
  'products:write',
] as const
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export function createApiKey(): string {
  return `kram_live_${randomBytes(32).toString('base64url')}`
}

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function authenticateApiKey(
  payload: Payload,
  headers: Headers,
  requiredScope: ApiKeyScope,
) {
  const authorization = headers.get('authorization')
  const token = authorization?.match(/^Bearer (kram_live_[A-Za-z0-9_-]{43})$/)?.[1]
  if (!token) return null

  const { docs } = await payload.find({
    collection: 'api-keys',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      or: [
        { token: { equals: token } },
        { tokenHash: { equals: hashApiKey(token) } },
      ],
    },
  })

  const apiKey = docs[0]
  if (!apiKey?.scopes?.includes(requiredScope)) return null
  return apiKey
}
