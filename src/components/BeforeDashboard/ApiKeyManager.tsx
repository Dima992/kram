'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type ApiKeyRecord = {
  id: string
  name: string
  scopes: ('orders:read' | 'orders:write' | 'products:read' | 'products:write')[]
  token?: string | null
  createdAt: string
}

type ApiKeyResponse = {
  docs?: ApiKeyRecord[]
  key?: ApiKeyRecord
  token?: string
  error?: string
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiKeyRecord['scopes']>(['orders:read', 'products:read'])
  const [token, setToken] = useState('')
  const [tokenKeyId, setTokenKeyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadKeys = useCallback(async () => {
    const response = await fetch('/api/admin/api-keys')
    const body = (await response.json()) as ApiKeyResponse
    if (!response.ok) throw new Error(body.error || 'Не вдалося завантажити API-ключі.')
    setKeys(body.docs || [])
  }, [])

  useEffect(() => {
    let cancelled = false

    void fetch('/api/admin/api-keys')
      .then(async (response) => {
        const body = (await response.json()) as ApiKeyResponse
        if (!response.ok) throw new Error(body.error || 'Не вдалося завантажити API-ключі.')
        if (!cancelled) setKeys(body.docs || [])
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Не вдалося завантажити API-ключі.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const createKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      })
      const body = (await response.json()) as ApiKeyResponse
      if (!response.ok) throw new Error(body.error || 'Не вдалося створити API-ключ.')
      if (!body.token || !body.key) throw new Error('Сервер не повернув створений API-ключ.')

      setToken(body.token)
      setTokenKeyId(body.key.id)
      setName('')
      await loadKeys()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не вдалося створити API-ключ.')
    } finally {
      setBusy(false)
    }
  }

  const revokeKey = async (id: string) => {
    if (!window.confirm('Відкликати цей API-ключ? Інтеграція одразу втратить доступ.')) return
    setBusy(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/api-keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json()) as ApiKeyResponse
        throw new Error(body.error || 'Не вдалося відкликати API-ключ.')
      }
      if (tokenKeyId === id) {
        setToken('')
        setTokenKeyId('')
      }
      await loadKeys()
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Не вдалося відкликати API-ключ.')
    } finally {
      setBusy(false)
    }
  }

  const toggleScope = (scope: ApiKeyRecord['scopes'][number]) => {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    )
  }

  return (
    <section style={{ marginBlock: '2rem', maxWidth: 900 }}>
      <h2>API для інтеграцій</h2>
      <p>
        Створюйте ключі з окремими правами на читання і запис замовлень та товарів. Ключі доступні
        для перегляду в цьому розділі налаштувань.
      </p>

      <form onSubmit={(event) => void createKey(event)} style={{ display: 'grid', gap: 12 }}>
        <label>
          Назва інтеграції
          <input
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            required
            style={{ display: 'block', maxWidth: 420, width: '100%' }}
            value={name}
          />
        </label>
        <fieldset style={{ display: 'grid', gap: 12 }}>
          <legend>Права доступу</legend>
          {(
            [
              ['orders:read', 'Читання замовлень'],
              ['orders:write', 'Запис замовлень (створення та зміна)'],
              ['products:read', 'Читання товарів'],
              ['products:write', 'Запис товарів (створення та зміна)'],
            ] as const
          ).map(([scope, label]) => (
            <label key={scope}>
              <input
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
                type="checkbox"
              />{' '}
              {label}
            </label>
          ))}
          <small>Видалення даних через API не дозволяється.</small>
        </fieldset>
        <button disabled={busy || !name.trim() || scopes.length === 0} type="submit">
          {busy ? 'Зачекайте…' : 'Створити API-ключ'}
        </button>
      </form>

      {token && (
        <div role="status" style={{ marginBlock: 16 }}>
          <strong>Новий API-ключ</strong>
          <input
            aria-label="Новий API-ключ"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            style={{ display: 'block', maxWidth: 600, width: '100%' }}
            value={token}
          />
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      <h3>Активні ключі</h3>
      {keys.length === 0 ? (
        <p>API-ключів поки немає.</p>
      ) : (
        <ul style={{ display: 'grid', gap: 8, paddingInlineStart: 20 }}>
          {keys.map((key) => (
            <li key={key.id}>
              <strong>{key.name}</strong>
              {' — '}
              {key.scopes
                .map((scope) => {
                  const labels: Record<ApiKeyRecord['scopes'][number], string> = {
                    'orders:read': 'читання замовлень',
                    'orders:write': 'запис замовлень',
                    'products:read': 'читання товарів',
                    'products:write': 'запис товарів',
                  }
                  return labels[scope]
                })
                .join(', ')}
              {' — '}
              {new Date(key.createdAt).toLocaleDateString()}
              {key.token ? (
                <input
                  aria-label={`API-ключ ${key.name}`}
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  style={{ display: 'block', maxWidth: 600, width: '100%' }}
                  value={key.token}
                />
              ) : (
                <small>Старий ключ: переглянути неможливо; створіть новий і відкличте цей.</small>
              )}
              {' — '}
              <button disabled={busy} onClick={() => void revokeKey(key.id)} type="button">
                Відкликати
              </button>
            </li>
          ))}
        </ul>
      )}

      <p>
        URL: <code>/api/external/v1/orders</code> та <code>/api/external/v1/products</code>.
        Передавайте ключ у заголовку <code>Authorization: Bearer ВАШ_КЛЮЧ</code>. Запис — через{' '}
        <code>POST</code> для створення та <code>PATCH /…/:id</code> для зміни; видалення
        заборонене. Для списків
        доступні параметри <code>page</code> і <code>limit</code> (до 100), для товарів —{' '}
        <code>locale=uk</code> або <code>locale=ru</code>.
      </p>
    </section>
  )
}
