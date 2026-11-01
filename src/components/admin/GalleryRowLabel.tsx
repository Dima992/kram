'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

// Подпись строки галереи: название выбранного варианта («Чорний»), «Відео» или «Загальне»
export const GalleryRowLabel: React.FC = () => {
  const { data } = useRowLabel<{
    mediaType?: string
    variantOption?: unknown
  }>()

  if (data?.mediaType === 'youtube') return <span>Відео</span>

  const opt = data?.variantOption as { label?: unknown; title?: unknown } | string | null | undefined
  const name =
    typeof opt === 'object' && opt !== null ? String(opt.label ?? opt.title ?? '') : ''

  return <span>{name || 'Загальне'}</span>
}