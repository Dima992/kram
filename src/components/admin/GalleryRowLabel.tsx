'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

// Подпись строки галереи: «Сірий · Відео», «Білий», «Загальне»
export const GalleryRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ mediaType?: string; variantLabel?: string }>()

  const name = data?.variantLabel || 'Загальне'
  const kind = data?.mediaType === 'youtube' ? 'Відео' : ''

  return <span>{kind ? `${name} · ${kind}` : name}</span>
}