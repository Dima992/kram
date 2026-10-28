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
  order?: number | null
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
  // Какие характеристики раскрыты (по умолчанию все свёрнуты)
  const [open, setOpen] = useState<Set<string>>(new Set())

  // Загружаем категории и характеристики
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/categories?limit=1000&depth=0&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch('/api/characteristics?limit=1000&depth=0&pagination=false&sort=order', {
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

  // Характеристики основной категории и её родителей, по полю «Порядок»
  const visible = useMemo(
    () =>
      chars
        .filter((ch) => {
          const cats = Array.isArray(ch.categories) ? ch.categories.map(idOf) : []
          return cats.some((id) => relevantCats.has(id))
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [chars, relevantCats],
  )

  const toggleValue = (charId: string, valueId: string) => {
    const current = stored[charId] ?? []
    const next = current.includes(valueId)
      ? current.filter((v) => v !== valueId)
      : [...current, valueId]

    const updated: Stored = { ...stored, [charId]: next }
    if (next.length === 0) delete updated[charId]
    setValue(updated)
  }

  const toggleOpen = (charId: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(charId)) next.delete(charId)
      else next.add(charId)
      return next
    })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((ch) => {
        const charId = String(ch.id)
        const selected = stored[charId] ?? []
        const isOpen = open.has(charId)

        // Сводка строится из текущего выбора: только выбранные значения
        const selectedLabels = (ch.values ?? [])
          .filter((v) => v.id && selected.includes(String(v.id)))
          .map((v) => v.label_uk || v.label_ru || '')
          .filter(Boolean)
        const summary = selectedLabels.join(', ')

        return (
          <div
            key={charId}
            style={{
              border: '1px solid var(--theme-elevation-150, #444)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Свёрнутая строка: название и выбранные значения */}
            <button
              type="button"
              onClick={() => toggleOpen(charId)}
              aria-expanded={isOpen}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                textAlign: 'left',
              }}
            >
              <span style={{ width: 180, flexShrink: 0, fontWeight: 600, fontSize: 14 }}>
                {ch.name_uk}
                {ch.name_ru ? ` / ${ch.name_ru}` : ''}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  opacity: summary ? 1 : 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {summary || 'не вибрано'}
              </span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Раскрытый список: все значения галочками */}
            {isOpen ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 16px',
                  padding: '8px 12px 12px',
                  borderTop: '1px solid var(--theme-elevation-150, #444)',
                }}
              >
                {(ch.values ?? []).map((v) => {
                  const valueId = v.id ? String(v.id) : ''
                  if (!valueId) return null
                  return (
                    <label
                      key={valueId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(valueId)}
                        onChange={() => toggleValue(charId, valueId)}
                        style={{ width: 16, height: 16 }}
                      />
                      {v.label_uk}
                      {v.label_ru ? ` / ${v.label_ru}` : ''}
                    </label>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}