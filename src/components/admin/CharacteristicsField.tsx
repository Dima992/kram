'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

type Value = {
  id?: string | null
  label_uk?: string | null
  label_ru?: string | null
}

type Characteristic = {
  id: number | string
  name_uk?: string | null
  name_ru?: string | null
  categories?: unknown
  values?: Value[] | null
}

type Cat = {
  id: number | string
  parent?: unknown
}

// Сохранённые значения: { id характеристики: [id выбранных значений] }
type Stored = Record<string, string[]>

const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { id: unknown }).id) : String(v)

const parentIdOf = (c: Cat): string => {
  const p = c.parent
  if (p === null || p === undefined || p === '') return ''
  if (typeof p === 'object') return String((p as { id?: unknown }).id ?? '')
  return String(p)
}

export const CharacteristicsField: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<Stored>({ path })
  const { value: categoriesValue } = useField<unknown[]>({ path: 'categories' })

  const [allCats, setAllCats] = useState<Cat[]>([])
  const [chars, setChars] = useState<Characteristic[]>([])
  const [loaded, setLoaded] = useState(false)

  // Загружаем категории и характеристики
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/categories?limit=1000&depth=0&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch('/api/characteristics?limit=1000&depth=0&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
    ])
      .then(([cats, characteristics]) => {
        if (!cancelled) {
          setAllCats(cats.docs ?? [])
          setChars(characteristics.docs ?? [])
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

  const stored: Stored = useMemo(
    () =>
      value && typeof value === 'object' && !Array.isArray(value) ? (value as Stored) : {},
    [value],
  )

  // Основная категория — первая выбранная; учитываем и её родителей
  const relevantCats = useMemo(() => {
    const ids = Array.isArray(categoriesValue) ? categoriesValue.map(idOf) : []
    const set = new Set<string>()
    if (ids.length === 0) return set

    const byId = new Map(allCats.map((c) => [String(c.id), c]))
    let current = ids[0]
    let guard = 0
    while (current && guard < 10) {
      set.add(current)
      const node = byId.get(current)
      current = node ? parentIdOf(node) : ''
      guard++
    }
    return set
  }, [categoriesValue, allCats])

  // Характеристики, которые относятся к основной категории или её родителям
  const visible = useMemo(
    () =>
      chars.filter((ch) => {
        const cats = Array.isArray(ch.categories) ? ch.categories.map(idOf) : []
        return cats.some((id) => relevantCats.has(id))
      }),
    [chars, relevantCats],
  )

  const toggle = (charId: string, valueId: string) => {
    const current = stored[charId] ?? []
    const next = current.includes(valueId)
      ? current.filter((v) => v !== valueId)
      : [...current, valueId]

    const updated: Stored = { ...stored, [charId]: next }
    if (next.length === 0) delete updated[charId]
    setValue(updated)
  }

  const box = {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 600 as const,
  }

  if (!loaded) {
    return <div style={{ fontSize: 13, opacity: 0.6 }}>Завантаження…</div>
  }

  if (relevantCats.size === 0) {
    return (
      <div style={{ fontSize: 13, opacity: 0.6 }}>
        Спочатку виберіть категорію товару (вона має бути в списку «Categories»).
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div style={{ fontSize: 13, opacity: 0.6 }}>
        Для цієї категорії ще немає характеристик. Створіть їх у розділі «Характеристики».
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={box}>Характеристики</div>

      {visible.map((ch) => {
        const charId = String(ch.id)
        const selected = stored[charId] ?? []

        return (
          <div
            key={charId}
            style={{
              marginBottom: 10,
              padding: 8,
              border: '1px solid var(--theme-elevation-150, #444)',
              borderRadius: 6,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
              {ch.name_uk}
              {ch.name_ru ? ` / ${ch.name_ru}` : ''}
            </div>

            {(ch.values ?? []).map((v) => {
              const valueId = v.id ? String(v.id) : ''
              if (!valueId) return null
              return (
                <label
                  key={valueId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 0',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(valueId)}
                    onChange={() => toggle(charId, valueId)}
                    style={{ width: 16, height: 16 }}
                  />
                  {v.label_uk}
                  {v.label_ru ? ` / ${v.label_ru}` : ''}
                </label>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}