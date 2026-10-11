import { describe, expect, it } from 'vitest'

import { createApiKey, hashApiKey } from '@/utilities/apiKeys'
import { validateOrderWrite, validateProductWrite } from '@/utilities/externalApi'

describe('API keys', () => {
  it('generates unique high-entropy bearer tokens', () => {
    const first = createApiKey()
    const second = createApiKey()

    expect(first).toMatch(/^kram_live_[A-Za-z0-9_-]{43}$/)
    expect(second).not.toBe(first)
  })

  it('computes a stable hash for legacy keys', () => {
    const token = createApiKey()
    const hash = hashApiKey(token)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hashApiKey(token)).toBe(hash)
    expect(hash).not.toBe(token)
  })

  it('validates order updates and rejects attempts to delete or modify protected fields', () => {
    expect(validateOrderWrite({ status: 'paid', phone: '+380001112233' })).toEqual({
      status: 'paid',
      phone: '+380001112233',
    })
    expect(validateOrderWrite({ accessToken: 'forbidden' })).toBeNull()
    expect(validateOrderWrite({ status: 'invalid' })).toBeNull()
  })

  it('validates product create/update data and rejects unknown fields', () => {
    expect(
      validateProductWrite({
        title: 'T-shirt',
        slug: 't-shirt',
        basePrice: 1200,
        _status: 'published',
      }),
    ).toEqual({
      title: 'T-shirt',
      slug: 't-shirt',
      basePrice: 1200,
      _status: 'published',
    })
    expect(validateProductWrite({ inventory: -1 })).toBeNull()
    expect(validateProductWrite({ token: 'forbidden' })).toBeNull()
  })
})
