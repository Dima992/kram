'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

type GoogleCategory = {
  id: number | string
  name_uk?: string | null
  requiredFields?: string[] | null
}

type Characteristic = {
  id: number | string
  googleAttribute?: string | null
  values?: { id?: string | null }[] | null
}

type Stored = Record<string, string[]>

const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { id: unknown }).id) : String(v)

// Человекочитаемые названия Google-полей
const FIELD_LABELS: Record<string, string> = {
  gender: 'Пол (gender)',
  age_group: 'Вікова група (age_group)',
  color: 'Колір (color)',
  size: 'Розмір (size)',
  material: 'Матеріал (material)',
  condition: 'Стан (condition)',
  brand: 'Бренд (brand)',
  gtin: 'Штрихкод / артикул (gtin / mpn)',
}

export const GoogleField: React.FC<{ path: string }> = ({ path }) => {
  const { value: categoryValue } = useField<unknown>({ path: 'googleCategory' })
  const { value: attributesValue } = useField<Stored>({ path: 'attributes' })
  const { value: conditionValue } = useField<string>({ path: 'googleCondition' })
  const { value: ageGroupValue } = useField<string>({ path: 'googleAgeGroup' })
  const { value: brandValue } = useField<string>({ path: 'brand' })
  const { value: gtinValue } = useField<string>({ path: 'gtin' })
  const { value: mpnValue } = useField<string>({ path: 'mpn' })

  const [category, setCategory] = useState<GoogleCategory | null>(null)
  const [chars, setChars] = useState<Characteristic[]>([])
  const [loaded, setLoaded] = useState(false)

  const categoryId = categoryValue ? idOf(categoryValue) : null

  useEffect(() => {
    if (!categoryId) {
      setCategory(null)
      setChars([])
      setLoaded(true)
      return
    }

    let cancelled = false
    Promise.all([
      fetch(`/api/google-categories/${categoryId}?depth=0`, {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch('/api/characteristics?limit=1000&depth=1&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
    ])
      .then(([cat, charsData]) => {
        if (!cancelled) {
          setCategory(cat)
          setChars(charsData.docs ?? [])
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [categoryId])

  // Какие Google-атрибуты уже закрыты
  const covered = useMemo(() => {
    const result = new Set<string>()
    const stored: Stored =
      attributesValue && typeof attributesValue === 'object' && !Array.isArray(attributesValue)
        ? (attributesValue as Stored)
        : {}

    // Из характеристик товара
    for (const ch of chars) {
      if (!ch.googleAttribute) continue
      const charId = String(ch.id)
      if ((stored[charId] ?? []).length > 0) {
        result.add(ch.googleAttribute)
      }
    }

    // Из полей прямо на вкладке Google
    if (conditionValue) result.add('condition')
    if (ageGroupValue) result.add('age_group')
    if (brandValue) result.add('brand')
    if (gtinValue || mpnValue) result.add('gtin')

    return result
  }, [chars, attributesValue, conditionValue, ageGroupValue, brandValue, gtinValue, mpnValue])

  if (!loaded) {
    return <div style={{ fontSize: 13, opacity: 0.6 }}>Завантаження…</div>
  }

  if (!categoryId || !category) {
    return (
      <div style={{ fontSize: 13, opacity: 0.6 }}>
        Виберіть Google-категорію вище, щоб побачити які поля потрібно заповнити.
      </div>
    )
  }

  // Берём список обязательных полей из записи Google-категории в админке
  const required: string[] = Array.isArray(category.requiredFields)
    ? category.requiredFields
    : []

  if (required.length === 0) {
    return (
      <div style={{ fontSize: 13, opacity: 0.6 }}>
        Для цієї категорії обов'язкові поля не задані. Відкрийте розділ «Google-категорії» і додайте їх.
      </div>
    )
  }

  const missing = required.filter((f) => !covered.has(f))
  const done = required.filter((f) => covered.has(f))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        Обов'язкові поля для Google ({category.name_uk}):
      </div>

      {/* Незаполненные — жёлтые */}
      {missing.map((field) => (
        <div
          key={field}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.5)',
            fontSize: 14,
          }}
        >
          <span style={{ color: '#ca8a04', fontSize: 16 }}>●</span>
          <span style={{ color: '#ca8a04', fontWeight: 500 }}>
            {FIELD_LABELS[field] ?? field}
          </span>
        </div>
      ))}

      {/* Заполненные — зелёные */}
      {done.map((field) => (
        <div
          key={field}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(22, 163, 74, 0.12)',
            border: '1px solid rgba(22, 163, 74, 0.4)',
            fontSize: 14,
          }}
        >
          <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
          <span style={{ color: '#16a34a', fontWeight: 500 }}>
            {FIELD_LABELS[field] ?? field}
          </span>
        </div>
      ))}

      {missing.length === 0 && (
        <div style={{ fontSize: 13, color: '#16a34a' }}>Усі обов'язкові поля заповнені ✓</div>
      )}
    </div>
  )
}