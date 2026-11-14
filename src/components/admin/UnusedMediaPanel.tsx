'use client'

import { useState } from 'react'

type Row = {
  id: string
  filename: string | null
  filesize: number | null
  createdAt: string
  thumbUrl: string | null
}

const formatSize = (bytes: number | null) =>
  bytes === null ? '—' : `${(bytes / 1024 / 1024).toFixed(2)} МБ`

export function UnusedMediaPanel() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/media/unused', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Помилка')
      setRows(data.rows)
      setSelected(new Set())
      setMessage(
        data.rows.length
          ? `Знайдено невикористаних файлів: ${data.rows.length}. Файли молодше ${data.minAgeDays} днів не показуються.`
          : 'Невикористаних файлів немає.',
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeSelected = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    const ok = window.confirm(
      `Видалити назавжди ${ids.length} фото? Це не можна скасувати. Перед видаленням система перевірить, що фото ніде не використовуються.`,
    )
    if (!ok) return

    setBusy(true)
    try {
      const res = await fetch('/api/media/unused-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const report = await res.json()
      if (!res.ok) throw new Error(report.error || 'Помилка')
      setMessage(
        `Видалено: ${report.deleted.length}. Пропущено (вже використовуються): ${report.skipped.length}. Помилки: ${report.failed.length}.`,
      )
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Помилка')
      setBusy(false)
    }
  }

  return (
    <div style={{ border: '1px solid #444', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>Невикористані фото</strong>
        <button type="button" onClick={load} disabled={busy}>
          Показати невикористані
        </button>
        {rows && rows.length > 0 && (
          <>
            <button type="button" onClick={() => setSelected(new Set(rows.map((r) => r.id)))} disabled={busy}>
              Вибрати всі
            </button>
            <button type="button" onClick={() => setSelected(new Set())} disabled={busy}>
              Зняти вибір
            </button>
            <button type="button" onClick={removeSelected} disabled={busy || selected.size === 0}>
              Видалити вибрані ({selected.size})
            </button>
          </>
        )}
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {rows.map((row) => (
            <label key={row.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
              />
              {row.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumbUrl} alt="" width={48} height={48} style={{ objectFit: 'cover' }} />
              )}
              <span style={{ flex: 1 }}>{row.filename ?? row.id}</span>
              <span>{formatSize(row.filesize)}</span>
              <span>{new Date(row.createdAt).toLocaleDateString('uk-UA')}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}