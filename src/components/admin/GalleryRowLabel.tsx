'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

// Подпись строки галереи: «Чорний · фото 2», «Загальне · фото 1», «Відео»
export const GalleryRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<{
    mediaType?: string
    variantOption?: unknown
  }>()

  if (data?.mediaType === 'youtube') return <span>Відео</span>

  const opt = data?.variantOption
  const name =
    typeof opt === 'object' && opt !== null
      ? String((opt as { label?: unknown; title?: unknown }).label ?? (opt as { title?: unknown }).title ?? '')
      : ''

  const label = name || 'Загальне'
  return (
    <span>
      {label} · фото {(rowNumber ?? 0) + 1}
    </span>
  )
}