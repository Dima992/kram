'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

type Cat = {
  id: number | string
  title?: string | null
  parent?: unknown
}

// Id родителя (или пустая строка, если верхний уровень)
const parentIdOf = (c: Cat): string => {
  const p = c.parent
  if (p === null || p === undefined || p === '') return ''
  if (typeof p === 'object') return String((p as { id?: unknown }).id ?? '')
  return String(p)
}

// Значение поля может быть id или объектом с id
const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { id: unknown }).id) : String(v)

export const CategoryTreeField: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<unknown[]>({ path })

  const selected = useMemo(
    () => new Set((Array.isArray(value) ? value : []).map(idOf)),
    [value],
  )

  const [cats, setCats] = useState<Cat[]>([])
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Загружаем все категории (украинские названия)
  useEffect(() => {
    let cancelled = false
    fetch('/api/categories?limit=1000&depth=0&sort=title&locale=uk&pagination=false', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setCats(d.docs ?? [])
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Карта: id родителя → список его детей
  const childrenOf = useMemo(() => {
    const map = new Map<string, Cat[]>()
    for (const c of cats) {
      const parent = parentIdOf(c)
      map.set(parent, [...(map.get(parent) ?? []), c])
    }
    return map
  }, [cats])

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setValue(Array.from(next))
  }

  const toggleOpen = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderLevel = (parentKey: string, depth: number): React.ReactNode =>
    (childrenOf.get(parentKey) ?? []).map((c) => {
      const id = String(c.id)
      const kids = childrenOf.get(id) ?? []
      const isOpen = open.has(id)

      return (
        <div key={id}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: depth * 18,
              padding: '3px 0',
            }}
          >
            {kids.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleOpen(id)}
                aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}
                style={{ width: 18, cursor: 'pointer', background: 'none', border: 'none' }}
              >
                {isOpen ? '▾' : '▸'}
              </button>
            ) : (
              <span style={{ width: 18, display: 'inline-block' }} />
            )}
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.has(id)}
                onChange={() => toggleSelect(id)}
              />{' '}
              {c.title}
            </label>
          </div>
          {kids.length > 0 && isOpen ? renderLevel(id, depth + 1) : null}
        </div>
      )
    })

  return (
    <div>
      <div style={{ marginBottom: 6, fontSize: 13, opacity: 0.8 }}>Категорії</div>
      {!loaded ? (
        <div style={{ fontSize: 13, opacity: 0.6 }}>Завантаження…</div>
      ) : cats.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.6 }}>Категорій ще немає.</div>
      ) : (
        renderLevel('', 0)
      )}
    </div>
  )
}