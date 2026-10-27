'use client'

import { useField } from '@payloadcms/ui'
import React from 'react'

type Props = {
  path: string
}

// Границы длины в знаках (зелёный = оптимально, жёлтый = допустимо)
const RANGES = {
  title: { greenMin: 50, greenMax: 60, yellowMin: 45, yellowMax: 65 },
  description: { greenMin: 150, greenMax: 160, yellowMin: 140, yellowMax: 170 },
}

export const SeoLengthHint: React.FC<Props> = ({ path }) => {
  const { value } = useField<string>({ path })
  const text = typeof value === 'string' ? value : ''
  const length = text.length

  const kind = path.includes('description') ? 'description' : 'title'
  const r = RANGES[kind]

  let color = '#c62828' // красный
  if (length >= r.greenMin && length <= r.greenMax) {
    color = '#2e7d32' // зелёный
  } else if (length >= r.yellowMin && length <= r.yellowMax) {
    color = '#f9a825' // жёлтый
  }

  return (
    <div style={{ color, fontSize: 13, marginTop: 4 }}>
      Знаків: {length} (оптимально {r.greenMin}–{r.greenMax})
    </div>
  )
}