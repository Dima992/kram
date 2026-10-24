'use client'

import { useField } from '@payloadcms/ui'

export function OrderPhoneLinks({ path }: { path: string }) {
  const { value } = useField<string>({ path })

  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : ''
  if (!digits) return null

  // Приводим номер к виду +380XXXXXXXXX
  const intl = digits.startsWith('380')
    ? `+${digits}`
    : digits.startsWith('0')
      ? `+38${digits}`
      : `+${digits}`

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
      <a href={`tel:${intl}`}>Позвонить</a>
      <a href={`https://t.me/${intl}`} target="_blank" rel="noopener noreferrer">
        Telegram
      </a>
      <a href={`viber://chat?number=${encodeURIComponent(intl)}`}>Viber</a>
      <button type="button" onClick={() => navigator.clipboard.writeText(intl)}>
        Скопировать номер
      </button>
    </div>
  )
}