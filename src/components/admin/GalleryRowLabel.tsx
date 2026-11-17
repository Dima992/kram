'use client'

import { useRowLabel, useTranslation } from '@payloadcms/ui'
import React from 'react'

// Подпись строки галереи: «Сірий · Відео», «Білий», «Загальне»
export const GalleryRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ mediaType?: string; variantLabel?: string }>()
  const { i18n } = useTranslation()
  const isRussian = i18n.language === 'ru'

  const name = data?.variantLabel || (isRussian ? 'Общее' : 'Загальне')
  const kind = data?.mediaType === 'youtube' ? (isRussian ? 'Видео' : 'Відео') : ''

  return <span>{kind ? `${name} · ${kind}` : name}</span>
}
