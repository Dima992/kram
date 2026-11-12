'use client'

import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

type ValueRow = {
  label_uk?: string | null
  label_ru?: string | null
}

// Подпись строки значения: показываем название, а не «Value 01»
export const CharacteristicValueRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<ValueRow>()

  const label = data?.label_uk || data?.label_ru
  const number = String((rowNumber ?? 0) + 1).padStart(2, '0')

  return <span>{label ? label : `Значення ${number}`}</span>
}