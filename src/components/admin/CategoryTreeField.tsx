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

  // Карта: id категории → её родитель
  const parentOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of cats) map.set(String(c.id), parentIdOf(c))
    return map
  }, [cats])

  // Раскрываем ветки, где есть выбранные категории, чтобы было видно галочки
  useEffect(() => {
    if (cats.length === 0) return
    const toOpen = new Set<string>()
    for (const id of selected) {
      let parent = parentOf.get(id) ?? ''
      let guard = 0
      while (parent && guard < 10) {
        toOpen.add(parent)
        parent = parentOf.get(parent) ?? ''
        guard++
      }
    }
    if (toOpen.size > 0) {
      setOpen((prev) => new Set([...prev, ...toOpen]))
    }
  }, [selected, cats, parentOf])

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
      const isChecked = selected.has(id)

      return (
        <div key={id}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingLeft: depth * 16 + 4,
              paddingTop: 4,
              paddingBottom: 4,
              paddingRight: 4,
              borderRadius: 4,
              background: isChecked ? 'var(--theme-elevation-100, #2a2a2a)' : 'transparent',
            }}
          >
            {kids.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleOpen(id)}
                aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}
                style={{
                  width: 20,
                  height: 20,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'var(--theme-text, inherit)',
                  fontSize: 12,
                  padding: 0,
                }}
              >
                {isOpen ? '▼' : '▶'}
              </button>
            ) : (
              <span style={{ width: 20, display: 'inline-block' }} />
            )}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                color: 'var(--theme-text, inherit)',
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSelect(id)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              {c.title}
            </label>
          </div>
          {kids.length > 0 && isOpen ? renderLevel(id, depth + 1) : null}
        </div>
      )
    })

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--theme-elevation-800, inherit)',
        }}
      >
        Категорії
      </div>
      <div
        style={{
          maxHeight: 360,
          overflowY: 'auto',
          border: '1px solid var(--theme-elevation-150, #444)',
          borderRadius: 6,
          padding: 6,
        }}
      >
        {!loaded ? (
          <div style={{ fontSize: 13, opacity: 0.6, padding: 4 }}>Завантаження…</div>
        ) : cats.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.6, padding: 4 }}>Категорій ще немає.</div>
        ) : (
          renderLevel('', 0)
        )}
      </div>
    </div>
  )
}