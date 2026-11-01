'use client'

import { useFormFields } from '@payloadcms/ui';
import React, { useEffect, useState } from 'react';

type Props = { path?: string; rowNumber?: number }

// Кэш названий вариантов, чтобы не загружать их для каждой строки заново
let optionCache: Record<string, string> | null = null
let optionRequest: Promise<Record<string, string>> | null = null

const loadOptionNames = (): Promise<Record<string, string>> => {
  if (optionCache) return Promise.resolve(optionCache)
  if (!optionRequest) {
    optionRequest = fetch('/api/variantOptions?limit=500&depth=0&pagination=false', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {}
        for (const doc of data.docs ?? []) map[String(doc.id)] = String(doc.label ?? '')
        optionCache = map
        return map
      })
      .catch(() => ({}))
  }
  return optionRequest
}

// Номер строки: берём из пути (gallery.2 → 2), иначе из rowNumber
const indexOf = (path: string | undefined, rowNumber: number | undefined): number => {
  const m = path?.match(/(\d+)$/)
  if (m) return Number(m[1])
  return rowNumber ?? 0
}

export const GalleryRowLabel: React.FC<Props> = ({ path, rowNumber }) => {
  const index = indexOf(path, rowNumber)
  const [names, setNames] = useState<Record<string, string>>(optionCache ?? {})

  // Все поля формы: по ним видим тип и выбранный вариант каждой строки галереи
  const fields = useFormFields(([f]) => f)

  useEffect(() => {
    let cancelled = false
    loadOptionNames().then((map) => {
      if (!cancelled) setNames(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const keys = Object.keys(fields ?? {})
  const rowIndexes = Array.from(
    new Set(
      keys
        .map((k) => k.match(/^gallery\.(\d+)\./)?.[1])
        .filter((v): v is string => v !== undefined)
        .map(Number),
    ),
  ).sort((a, b) => a - b)

  const valueOf = (i: number, key: string): unknown => fields?.[`gallery.${i}.${key}`]?.value

  // Группа строки: видео, общее фото или фото конкретного варианта
  const groupOf = (i: number): string => {
    if (valueOf(i, 'mediaType') === 'youtube') return 'video'
    const opt = valueOf(i, 'variantOption')
    const id = typeof opt === 'object' && opt !== null ? (opt as { id?: unknown }).id : opt
    return id ? String(id) : 'common'
  }

  const group = groupOf(index)

  if (group === 'video') return <span>Відео</span>
  if (group === 'common') {
    // Номер среди общих фото
    const ordinal = rowIndexes.filter((i) => i <= index && groupOf(i) === 'common').length
    return <span>Загальне · фото {ordinal}</span>
  }

  const name = names[group] || 'Варіант'
  const ordinal = rowIndexes.filter((i) => i <= index && groupOf(i) === group).length
  return (
    <span>
      {name} · фото {ordinal}
    </span>
  )
}