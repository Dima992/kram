'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

// Подпись строки галереи: название варианта, «Відео» или «Загальне»
export const GalleryRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ mediaType?: string; variantLabel?: string }>()

  if (data?.mediaType === 'youtube') return <span>Відео</span>

  return <span>{data?.variantLabel || 'Загальне'}</span>
}