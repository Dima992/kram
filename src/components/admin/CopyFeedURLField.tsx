'use client'

import { useField } from '@payloadcms/ui'
import React, { useState } from 'react'

export const CopyFeedURLField: React.FC<{ path: string }> = ({ path }) => {
  const { value } = useField<string>({ path })
  const [copied, setCopied] = useState(false)
  const url = typeof value === 'string' ? value : ''

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Если буфер обмена недоступен, просто выделяем ссылку, чтобы её можно было скопировать вручную
      window.getSelection()?.removeAllRanges()
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Посилання на фід</div>

      {url ? (
        <button
          type="button"
          onClick={handleCopy}
          title="Натисніть, щоб скопіювати"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid rgba(128, 128, 128, 0.4)',
            background: 'rgba(128, 128, 128, 0.08)',
            fontSize: 13,
            wordBreak: 'break-all',
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          {url}
        </button>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Посилання з'явиться після збереження фіда.
        </div>
      )}

      <div style={{ fontSize: 12, marginTop: 6, minHeight: 16, color: '#16a34a' }}>
        {copied ? 'Скопійовано ✓' : 'Скопіюйте це посилання в налаштування товарного каталогу.'}
      </div>
    </div>
  )
}