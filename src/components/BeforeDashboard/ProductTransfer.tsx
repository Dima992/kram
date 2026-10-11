'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import './index.scss'

type SourceOption = {
  id: string
  name: string
  supplierFeedURL?: string | null
  autoImportEnabled?: boolean | null
  autoImportFrequency?: 'daily' | 'every4hours' | null
  lastImportAt?: string | null
  lastImportStatus?: 'idle' | 'running' | 'success' | 'error' | null
  lastImportMessage?: string | null
}
type ImportReport = {
  total?: number
  valid?: number
  created?: number
  updated?: number
  errors?: { row: number; error: string }[]
  preview?: { sku: string; title: string; price: number; currency: string }[]
}

export function ProductTransfer() {
  const [sources, setSources] = useState<SourceOption[]>([])
  const [sourceID, setSourceID] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)
  const selectedSource = sources.find((source) => source.id === sourceID)

  const loadSources = useCallback(async () => {
    const query = new URLSearchParams({ limit: '100', sort: 'name', depth: '0' })
    for (const field of [
      'id',
      'name',
      'supplierFeedURL',
      'autoImportEnabled',
      'autoImportFrequency',
      'lastImportAt',
      'lastImportStatus',
      'lastImportMessage',
    ]) {
      query.set(`select[${field}]`, 'true')
    }

    const response = await fetch(`/api/import-sources?${query.toString()}`, {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('Не вдалося завантажити профілі постачальників.')
    const result = (await response.json()) as { docs?: SourceOption[] }
    setSources(result.docs || [])
  }, [])

  useEffect(() => {
    const request = Promise.resolve().then(loadSources)
    request.catch((fetchError: unknown) => {
      setError(fetchError instanceof Error ? fetchError.message : 'Помилка завантаження профілів.')
    })
  }, [loadSources])

  const importSupplierLink = async () => {
    if (!sourceID || !selectedSource?.supplierFeedURL) return
    setBusy(true)
    setError('')
    setReport(null)

    try {
      const response = await fetch('/api/admin/catalog/import-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceID }),
      })
      const result = (await response.json()) as ImportReport & { error?: string }
      if (!response.ok) {
        setReport(result)
        setError(result.error || 'Не вдалося завантажити прайс.')
        return
      }
      setReport(result)
      await loadSources()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка з’єднання.')
    } finally {
      setBusy(false)
    }
  }

  const toggleAutomaticImport = async (enabled: boolean) => {
    if (!selectedSource) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/import-sources/${selectedSource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoImportEnabled: enabled }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { errors?: { message?: string }[] }
        throw new Error(result.errors?.[0]?.message || 'Не вдалося змінити автоматичне оновлення.')
      }
      await loadSources()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка з’єднання.')
    } finally {
      setBusy(false)
    }
  }

  const sendImport = async (dryRun: boolean) => {
    if (!sourceID || !file) return
    setBusy(true)
    setError('')
    setReport(null)

    const formData = new FormData()
    formData.set('sourceID', sourceID)
    formData.set('file', file)
    formData.set('dryRun', String(dryRun))

    try {
      const response = await fetch('/api/admin/catalog/import', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as ImportReport & { error?: string }
      if (!response.ok) {
        setReport(result)
        setError(result.error || 'Імпорт не виконано.')
        setChecked(false)
        return
      }

      setReport(result)
      setChecked(dryRun && (result.valid || 0) > 0 && (result.errors || []).length === 0)
      if (!dryRun) setChecked(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка з’єднання.')
      setChecked(false)
    } finally {
      setBusy(false)
    }
  }

  const exportProducts = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/catalog/export')
      if (!response.ok) {
        const result = (await response.json()) as { error?: string }
        throw new Error(result.error || 'Не вдалося експортувати каталог.')
      }

      const blob = await response.blob()
      const downloadURL = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadURL
      link.download = 'catalog-export.xlsx'
      link.click()
      URL.revokeObjectURL(downloadURL)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Помилка експорту.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="product-transfer">
      <div>
        <h2>Імпорт товарів</h2>
        <p>
          Імпортуйте товари з CSV, Excel або XML-фіда Google Merchant. Назва та опис товару
          автоматично записуються українською і російською.
        </p>
      </div>

      <div className="product-transfer__actions">
        <label>
          Постачальник
          <select
            value={sourceID}
            onChange={(event) => {
              setSourceID(event.target.value)
              setChecked(false)
              setReport(null)
            }}
          >
            <option value="">Оберіть профіль</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Файл постачальника
          <input
            accept=".xlsx,.csv,.tsv,.txt,.xml"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null)
              setChecked(false)
              setReport(null)
            }}
            type="file"
          />
        </label>
      </div>

      <div className="product-transfer__buttons">
        <button
          disabled={busy || !sourceID || !file}
          onClick={() => void sendImport(true)}
          type="button"
        >
          Перевірити файл
        </button>
        <button
          disabled={busy || !checked}
          onClick={() => void sendImport(false)}
          type="button"
        >
          Імпортувати товари
        </button>
        <button disabled={busy} onClick={() => void exportProducts()} type="button">
          Експортувати весь каталог (.xlsx)
        </button>
        <button
          disabled={busy || !sourceID || !selectedSource?.supplierFeedURL}
          onClick={() => void importSupplierLink()}
          type="button"
        >
          Завантажити прайс за посиланням зараз
        </button>
      </div>

      <p className="product-transfer__hint">
        Спочатку створіть профіль для кожного джерела. Для CSV/Excel вкажіть заголовки колонок;
        XML-фід Google Merchant зіставляється автоматично. Імпорт оновлює товари за артикулом
        джерела; нові товари за замовчуванням створюються як чернетки. Ручне завантаження файлу: до
        4 МБ; файл за посиланням: до 10 МБ, не більше 5 000 товарів.
      </p>
      {selectedSource && (
        <div className="product-transfer__schedule">
          <Link href={`/admin/collections/import-sources/${selectedSource.id}`}>
            Налаштувати «{selectedSource.name}»
          </Link>
          {selectedSource.supplierFeedURL ? (
            <>
              <label className="product-transfer__toggle">
                <input
                  checked={Boolean(selectedSource.autoImportEnabled)}
                  disabled={busy}
                  onChange={(event) => void toggleAutomaticImport(event.target.checked)}
                  type="checkbox"
                />
                Автоматично оновлювати прайс за розкладом Vercel
              </label>
              {selectedSource.autoImportEnabled && selectedSource.autoImportFrequency === 'every4hours' && (
                <p className="product-transfer__warning" role="status">
                  Ви обрали кожні 4 години, але поточне розкладення Vercel Hobby запускається лише
                  раз на день. Цей прайс також оновлюватиметься раз на день. Для 4-годинного
                  розкладу потрібен Vercel Pro і зміна налаштування cron після переходу.
                </p>
              )}
              {selectedSource.autoImportEnabled && selectedSource.autoImportFrequency !== 'every4hours' && (
                <p className="product-transfer__hint">
                  Автоматичний імпорт запускається раз на день. На Vercel Hobby час запуску може
                  зміщуватися приблизно до однієї години.
                </p>
              )}
            </>
          ) : (
            <p className="product-transfer__hint">
              Щоб імпортувати за посиланням і ввімкнути розклад, додайте посилання на прайс у профілі
              постачальника.
            </p>
          )}
          {selectedSource.lastImportStatus && selectedSource.lastImportStatus !== 'idle' && (
            <p role="status">
              Останній імпорт: {selectedSource.lastImportStatus}
              {selectedSource.lastImportAt
                ? ` — ${new Date(selectedSource.lastImportAt).toLocaleString()}`
                : ''}
              {selectedSource.lastImportMessage ? ` — ${selectedSource.lastImportMessage}` : ''}
            </p>
          )}
        </div>
      )}
      <Link href="/admin/collections/import-sources/create">Налаштувати нового постачальника</Link>

      {busy && <p role="status">Обробляємо файл…</p>}
      {error && <p className="product-transfer__error" role="alert">{error}</p>}

      {report && (
        <div className="product-transfer__report" aria-live="polite">
          <strong>
            {report.valid !== undefined
              ? `Перевірено: ${report.valid} із ${report.total} рядків готові до імпорту.`
              : `Додано: ${report.created || 0}; оновлено: ${report.updated || 0}.`}
          </strong>
          {report.preview && report.preview.length > 0 && (
            <ul>
              {report.preview.map((item) => (
                <li key={item.sku}>
                  {item.sku} — {item.title} — {item.price} {item.currency}
                </li>
              ))}
            </ul>
          )}
          {report.errors && report.errors.length > 0 && (
            <ul className="product-transfer__error">
              {report.errors.slice(0, 20).map((item, index) => (
                <li key={`${item.row}-${index}`}>
                  Рядок {item.row}: {item.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
