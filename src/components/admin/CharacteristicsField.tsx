'use client'

import { useDocumentInfo, useField, useFormModified } from '@payloadcms/ui'
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
  adminNote?: string | null
  order?: number | null
  categories?: unknown
  values?: Value[] | null
}

type Cat = {
  id: number | string
  parent?: unknown
}

// Выбранные значения: { id характеристики: [id значений] }
type Stored = Record<string, string[]>

// Настройки в этом товаре: нужны ли фото (вариант определяется автоматически)
type Setting = { photos?: boolean }
type Settings = Record<string, Setting>

const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { id: unknown }).id) : String(v)

const parentIdOf = (c: Cat): string => {
  const p = c.parent
  if (p === null || p === undefined || p === '') return ''
  if (typeof p === 'object') return String((p as { id?: unknown }).id ?? '')
  return String(p)
}

const AMBER_BORDER = 'rgba(234, 179, 8, 0.7)'
const AMBER_BG = 'rgba(234, 179, 8, 0.10)'
const AMBER_TEXT = '#ca8a04'

export const CharacteristicsField: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<Stored>({ path })
  const { value: settingsValue, setValue: setSettings } = useField<Settings>({
    path: 'variantSettings',
  })
  const { value: categoriesValue } = useField<unknown[]>({ path: 'categories' })
  const { value: enabledValue } = useField<boolean>({ path: 'enableVariants' })
  const { id: docId } = useDocumentInfo()
  // true, если в форме есть несохранённые изменения
  const modified = useFormModified()
  const productId = docId ? String(docId) : ''

  const [allCats, setAllCats] = useState<Cat[]>([])
  const [chars, setChars] = useState<Characteristic[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

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

  const settings: Settings = useMemo(
    () =>
      settingsValue && typeof settingsValue === 'object' && !Array.isArray(settingsValue)
        ? (settingsValue as Settings)
        : {},
    [settingsValue],
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

  // Характеристики: без категорий — для всего магазина; с категориями — если категория товара совпадает
  const visible = useMemo(
    () =>
      chars
        .filter((ch) => {
          const cats = Array.isArray(ch.categories) ? ch.categories.map(idOf) : []
          return cats.length === 0 || cats.some((id) => relevantCats.has(id))
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [chars, relevantCats],
  )

  // Вариант = характеристика, где выбрано больше одного значения (считается автоматически)
  const variantChars = visible.filter((ch) => (stored[String(ch.id)] ?? []).length > 1)
  const counts = variantChars.map((ch) => (stored[String(ch.id)] ?? []).length)
  const combinations = counts.reduce((total, n) => total * n, 1)

  const toggleValue = (charId: string, valueId: string) => {
    const current = stored[charId] ?? []
    const next = current.includes(valueId)
      ? current.filter((v) => v !== valueId)
      : [...current, valueId]

    const updated: Stored = { ...stored, [charId]: next }
    if (next.length === 0) delete updated[charId]
    setValue(updated)
  }

  const updatePhotos = (charId: string, photos: boolean) => {
    setSettings({ ...settings, [charId]: { ...settings[charId], photos } })
  }

  const toggleOpen = (charId: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(charId)) next.delete(charId)
      else next.add(charId)
      return next
    })
  }

  const generate = async () => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/generate-variants', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Помилка створення варіантів')
      } else {
        setMessage(`Створено: ${data.created}. Вже були раніше: ${data.skipped}.`)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      setMessage('Немає зв’язку з сервером')
    } finally {
      setBusy(false)
    }
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

  const canGenerate = !busy && !modified && Boolean(productId) && variantChars.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: AMBER_TEXT, fontWeight: 600 }}>
          {variantChars.length === 0
            ? 'Щоб створити варіанти, виберіть більше одного значення хоча б в одній характеристиці'
            : `Варіанти: ${counts.join(' × ')} = ${combinations} комбінацій`}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: `1px solid ${AMBER_BORDER}`,
            background: canGenerate ? AMBER_BG : 'transparent',
            color: 'inherit',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            opacity: canGenerate ? 1 : 0.5,
            fontSize: 13,
          }}
        >
          {busy ? 'Створюю…' : 'Згенерувати варіанти'}
        </button>
      </div>

      {modified ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Спочатку збережіть товар, потім натисніть кнопку.
        </div>
      ) : null}

      {message ? <div style={{ fontSize: 13 }}>{message}</div> : null}

      {visible.map((ch) => {
        const charId = String(ch.id)
        const selected = stored[charId] ?? []
        const setting = settings[charId] ?? {}
        const isVariant = selected.length > 1
        const isOpen = open.has(charId)

        // Сводка строится из текущего выбора: только выбранные значения
        const summary = (ch.values ?? [])
          .filter((v) => v.id && selected.includes(String(v.id)))
          .map((v) => v.label_uk || v.label_ru || '')
          .filter(Boolean)
          .join(', ')

        return (
          <div
            key={charId}
            style={{
              border: `1px solid ${isVariant ? AMBER_BORDER : 'var(--theme-elevation-150, #444)'}`,
              background: isVariant ? AMBER_BG : 'transparent',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
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
                {ch.adminNote ? (
                  <span style={{ fontWeight: 400, opacity: 0.6 }}> ({ch.adminNote})</span>
                ) : null}
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
              {isVariant ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: AMBER_TEXT, whiteSpace: 'nowrap' }}>
                  Варіант · {selected.length}
                </span>
              ) : null}
              {isVariant && setting.photos ? (
                <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>фото</span>
              ) : null}
              <span style={{ fontSize: 12, opacity: 0.7 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen ? (
              <div
                style={{
                  borderTop: '1px solid var(--theme-elevation-150, #444)',
                  padding: '8px 12px 12px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    marginBottom: 10,
                    cursor: isVariant ? 'pointer' : 'not-allowed',
                    opacity: isVariant ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(setting.photos)}
                    disabled={!isVariant}
                    onChange={(e) => updatePhotos(charId, e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Фото потрібні (блок фото для кожного значення)
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
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

                {selected.length === 1 && enabledValue ? (
                  <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
                    Якщо за цією характеристикою вже створені варіанти, їх можна видалити в розділі «Варіанти».
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}