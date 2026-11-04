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
  name_uk?: string | null
  adminNote?: string | null
  googleAttribute?: string | null
}

type VariantType = {
  id: number | string
  name?: string | null
}

type Stored = Record<string, string[]>

const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { id: unknown }).id) : String(v)

export const GoogleField: React.FC<{ path: string }> = () => {
  const { value: categoryValue } = useField<unknown>({ path: 'googleCategory' })
  const { value: attributesValue } = useField<Stored>({ path: 'attributes' })
  const { value: variantTypesValue } = useField<unknown[]>({ path: 'variantTypes' })
  const { value: conditionValue } = useField<string>({ path: 'googleCondition' })
  const { value: ageGroupValue } = useField<string>({ path: 'googleAgeGroup' })
  const { value: brandValue } = useField<string>({ path: 'brand' })
  const { value: gtinValue } = useField<string>({ path: 'gtin' })
  const { value: mpnValue } = useField<string>({ path: 'mpn' })

  const [category, setCategory] = useState<GoogleCategory | null>(null)
  const [chars, setChars] = useState<Characteristic[]>([])
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([])
  const [loaded, setLoaded] = useState(false)

  const categoryId = categoryValue ? idOf(categoryValue) : null

  useEffect(() => {
    if (!categoryId) {
      setCategory(null)
      setLoaded(true)
      return
    }

    let cancelled = false
    Promise.all([
      fetch(`/api/google-categories/${categoryId}?depth=0`, {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch('/api/characteristics?limit=1000&depth=0&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
      fetch('/api/variantTypes?limit=1000&depth=0&pagination=false', {
        credentials: 'include',
      }).then((r) => r.json()),
    ])
      .then(([cat, charsData, typesData]) => {
        if (cancelled) return
        setCategory(cat)
        setChars(charsData.docs ?? [])
        setVariantTypes(typesData.docs ?? [])
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [categoryId])

  // Какие Google-теги уже заполнены
  const covered = useMemo(() => {
    const result = new Set<string>()
    const stored: Stored =
      attributesValue && typeof attributesValue === 'object' && !Array.isArray(attributesValue)
        ? (attributesValue as Stored)
        : {}

    // Характеристики, выбранные в самом товаре
    for (const ch of chars) {
      if (!ch.googleAttribute) continue
      if ((stored[String(ch.id)] ?? []).length > 0) {
        result.add(ch.googleAttribute)
      }
    }

    // Характеристики-варианты (цвет, размер): их значения заполняются в вариантах
    const selectedTypeIDs = (Array.isArray(variantTypesValue) ? variantTypesValue : [])
      .filter((v) => v !== null && v !== undefined)
      .map(idOf)
    for (const typeID of selectedTypeIDs) {
      const type = variantTypes.find((t) => String(t.id) === typeID)
      const name = type?.name ?? ''
      if (!name.startsWith('char-')) continue
      const ch = chars.find((c) => String(c.id) === name.slice(5))
      if (ch?.googleAttribute) result.add(ch.googleAttribute)
    }

    // Поля самого товара
    if (conditionValue) result.add('condition')
    if (ageGroupValue) result.add('age_group')
    if (brandValue) result.add('brand')
    if (gtinValue || mpnValue) result.add('gtin')

    return result
  }, [
    chars,
    variantTypes,
    variantTypesValue,
    attributesValue,
    conditionValue,
    ageGroupValue,
    brandValue,
    gtinValue,
    mpnValue,
  ])

  // Название для показа берём из характеристики, а не из списка в коде
  const labelFor = (tag: string): string => {
    const ch = chars.find((c) => c.googleAttribute === tag)
    const name = ch?.adminNote?.trim() || ch?.name_uk?.trim()
    return name ? `${name} (${tag})` : tag
  }

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

  // Список обязательных полей берём из записи Google-категории в админке
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
          <span style={{ color: '#ca8a04', fontWeight: 500 }}>{labelFor(field)}</span>
        </div>
      ))}

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
          <span style={{ color: '#16a34a', fontWeight: 500 }}>{labelFor(field)}</span>
        </div>
      ))}

      {missing.length === 0 && (
        <div style={{ fontSize: 13, color: '#16a34a' }}>Усі обов'язкові поля заповнені ✓</div>
      )}
    </div>
  )
}