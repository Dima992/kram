'use client'

import { useDocumentInfo, useFormFields, useFormModified } from '@payloadcms/ui'
import { useState } from 'react'
import './index.scss'

type ImportResult = {
  created?: number
  updated?: number
  errors?: { row: number; error: string }[]
  error?: string
}

export function ImportSourceAction() {
  const { id } = useDocumentInfo()
  const feedURL = useFormFields(([fields]) => fields.supplierFeedURL?.value)
  const formModified = useFormModified()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  const importNow = async () => {
    if (!id) return

    setBusy(true)
    setError('')
    setMessage('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/catalog/import-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceID: id }),
      })
      const responseBody = (await response.json()) as ImportResult
      setResult(responseBody)
      if (!response.ok) throw new Error(responseBody.error || 'Не вдалося запустити імпорт.')

      setMessage(
        responseBody.errors?.length
          ? 'Імпорт завершено з помилками або попередженнями.'
          : 'Імпорт за посиланням завершено.',
      )
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Помилка з’єднання.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="product-transfer__profile-action">
      <button
        disabled={!id || typeof feedURL !== 'string' || !feedURL.trim() || formModified || busy}
        onClick={() => void importNow()}
        type="button"
      >
        {busy ? 'Виконується імпорт…' : 'Запустити імпорт зараз'}
      </button>
      {!id && <p className="product-transfer__hint">Спочатку збережіть профіль імпорту.</p>}
      {id && (typeof feedURL !== 'string' || !feedURL.trim()) && (
        <p className="product-transfer__hint">Додайте посилання на фід у профілі.</p>
      )}
      {formModified && (
        <p className="product-transfer__hint" role="status">
          Спочатку збережіть зміни профілю.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {result && (
        <p role="status">
          Створено: {result.created || 0}; оновлено: {result.updated || 0}.
        </p>
      )}
      {result?.errors?.length ? (
        <ul className="product-transfer__error" role="alert">
          {result.errors.slice(0, 20).map((item, index) => (
            <li key={`${item.row}-${index}`}>
              Рядок {item.row}: {item.error}
            </li>
          ))}
        </ul>
      ) : null}
      {error && <p className="product-transfer__error" role="alert">{error}</p>}
    </div>
  )
}
