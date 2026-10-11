'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import './SupplierImportDashboard.scss'

type SupplierOption = {
  id: string
  name: string
  supplierFeedURL?: string | null
}

type SupplierImportRow = {
  id: string
  sourceType: 'file' | 'url' | 'telegram'
  supplierRef: string | { id: string; name: string }
  mappedData?: unknown
  mappingStatus: 'queued' | 'processing' | 'completed' | 'failed'
  mappingError?: string | null
  createdAt: string
}

type ProductPreview = {
  ukTitle: string
  ruTitle: string
  price: number
  currency: string
  image?: string
}

type APIResponse = {
  error?: string
  errors?: { message?: string }[]
  jobs?: number
  rows?: number
  processed?: number
  failed?: number
  pending?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getProductPreview(value: unknown): ProductPreview | null {
  if (!isRecord(value) || !isRecord(value.uk) || !isRecord(value.ru)) return null
  if (
    typeof value.uk.title !== 'string' ||
    typeof value.ru.title !== 'string' ||
    typeof value.basePrice !== 'number' ||
    typeof value.baseCurrency !== 'string'
  ) {
    return null
  }

  const image = typeof value.supplierImageURL === 'string' ? value.supplierImageURL : undefined
  return {
    ukTitle: value.uk.title,
    ruTitle: value.ru.title,
    price: value.basePrice,
    currency: value.baseCurrency,
    image: image && /^https?:\/\//i.test(image) ? image : undefined,
  }
}

function getResponseError(body: APIResponse, fallback: string): string {
  return body.error || body.errors?.map((error) => error.message).filter(Boolean).join('; ') || fallback
}

const tabs = [
  { id: 'files', label: 'Файлы и ссылки' },
  { id: 'telegram', label: 'Telegram-каналы' },
  { id: 'inbox', label: 'Модерация входящих' },
] as const

type TabID = (typeof tabs)[number]['id']

export function SupplierImportDashboard() {
  const [activeTab, setActiveTab] = useState<TabID>('inbox')
  const [sources, setSources] = useState<SupplierOption[]>([])
  const [sourceID, setSourceID] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [priceURL, setPriceURL] = useState('')
  const [channel, setChannel] = useState('')
  const [since, setSince] = useState('')
  const [telegramPosts, setTelegramPosts] = useState('[]')
  const [imports, setImports] = useState<SupplierImportRow[]>([])
  const [selectedIDs, setSelectedIDs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSources = useCallback(async () => {
    const query = new URLSearchParams({ limit: '100', sort: 'name', depth: '0' })
    query.set('select[id]', 'true')
    query.set('select[name]', 'true')
    query.set('select[supplierFeedURL]', 'true')

    const response = await fetch(`/api/import-sources?${query.toString()}`, { cache: 'no-store' })
    const body = (await response.json()) as APIResponse & { docs?: SupplierOption[] }
    if (!response.ok) throw new Error(getResponseError(body, 'Не удалось загрузить профили поставщиков.'))
    setSources(body.docs || [])
  }, [])

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true)
    try {
      const query = new URLSearchParams({
        'where[status][equals]': 'pending',
        limit: '100',
        sort: '-createdAt',
        depth: '1',
      })
      for (const field of ['id', 'sourceType', 'supplierRef', 'mappedData', 'mappingStatus', 'mappingError', 'createdAt']) {
        query.set(`select[${field}]`, 'true')
      }
      const response = await fetch(`/api/supplier-imports?${query.toString()}`, { cache: 'no-store' })
      const body = (await response.json()) as APIResponse & { docs?: SupplierImportRow[] }
      if (!response.ok) {
        throw new Error(getResponseError(body, 'Не удалось загрузить очередь модерации.'))
      }
      setImports(body.docs || [])
      setSelectedIDs((current) => current.filter((id) => body.docs?.some((item) => item.id === id)))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить очередь модерации.')
    } finally {
      setLoadingInbox(false)
    }
  }, [])

  useEffect(() => {
    const request = Promise.resolve().then(loadSources)
    request.catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить профили поставщиков.')
    })
  }, [loadSources])

  useEffect(() => {
    void Promise.resolve().then(loadInbox)
  }, [loadInbox])

  const startFileImport = async () => {
    if (!sourceID || (!file && !priceURL.trim() && !sources.find((item) => item.id === sourceID)?.supplierFeedURL)) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    const formData = new FormData()
    formData.set('sourceID', sourceID)
    if (file) formData.set('file', file)
    if (!file && priceURL.trim()) formData.set('url', priceURL.trim())

    try {
      const response = await fetch('/api/admin/supplier-import', { method: 'POST', body: formData })
      const body = (await response.json()) as APIResponse
      if (!response.ok) throw new Error(getResponseError(body, 'Не удалось запустить импорт.'))
      setMessage(`Импорт поставлен в очередь: ${body.rows || 0} строк, заданий: ${body.jobs || 0}.`)
      setFile(null)
      await loadInbox()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Не удалось запустить импорт.')
    } finally {
      setBusy(false)
    }
  }

  const startTelegramImport = async () => {
    if (!sourceID || !channel.trim()) return

    let posts: unknown
    try {
      posts = JSON.parse(telegramPosts)
    } catch {
      setError('Сообщения Telegram должны быть корректным JSON-массивом.')
      return
    }
    if (
      !Array.isArray(posts) ||
      posts.length === 0 ||
      !posts.every(
        (post) =>
          isRecord(post) &&
          (typeof post.messageId === 'string' || typeof post.messageId === 'number') &&
          typeof post.date === 'string' &&
          Number.isFinite(new Date(post.date).getTime()) &&
          typeof post.text === 'string' &&
          ((typeof post.price === 'number' && Number.isFinite(post.price) && post.price > 0) ||
            (typeof post.price === 'string' && Boolean(post.price.trim()))),
      )
    ) {
      setError('Каждое сообщение должно содержать messageId, корректную date, text и положительную price.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/supplier-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceID, channel: channel.trim(), since: since || undefined, posts }),
      })
      const body = (await response.json()) as APIResponse
      if (!response.ok) throw new Error(getResponseError(body, 'Не удалось синхронизировать канал.'))
      setMessage(`Сообщения поставлены в очередь: ${body.rows || 0}, заданий: ${body.jobs || 0}.`)
      await loadInbox()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Не удалось синхронизировать канал.')
    } finally {
      setBusy(false)
    }
  }

  const processQueue = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/supplier-import/process', { method: 'POST' })
      const body = (await response.json()) as APIResponse
      if (!response.ok) throw new Error(getResponseError(body, 'Не удалось обработать пакет импорта.'))
      setMessage(
        `Пакет обработан: ${body.processed || 0}; ошибок: ${body.failed || 0}; осталось в очереди: ${body.pending || 0}.`,
      )
      await loadInbox()
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'Не удалось обработать пакет импорта.')
    } finally {
      setBusy(false)
    }
  }

  const moderateSelected = async (status: 'approved' | 'rejected') => {
    if (!selectedIDs.length) return

    setBusy(true)
    setError('')
    setMessage('')
    let completed = 0
    const failures: string[] = []

    for (const id of selectedIDs) {
      try {
        const response = await fetch(`/api/supplier-imports/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        const body = (await response.json()) as APIResponse
        if (!response.ok) throw new Error(getResponseError(body, 'Операция не выполнена.'))
        completed += 1
      } catch (moderationError) {
        failures.push(
          `${id}: ${moderationError instanceof Error ? moderationError.message : 'ошибка запроса'}`,
        )
      }
    }

    setSelectedIDs([])
    setMessage(`${status === 'approved' ? 'Одобрено' : 'Отклонено'} записей: ${completed}.`)
    if (failures.length) {
      setError(`Не удалось обработать ${failures.length} записей: ${failures.join(' | ')}`)
    }
    await loadInbox()
    setBusy(false)
  }

  const toggleSelected = (id: string) => {
    setSelectedIDs((current) =>
      current.includes(id) ? current.filter((selectedID) => selectedID !== id) : [...current, id],
    )
  }

  const toggleAll = () => {
    setSelectedIDs(selectedIDs.length === imports.length ? [] : imports.map((item) => item.id))
  }

  return (
    <section className="supplier-import">
      <header className="supplier-import__header">
        <div>
          <h1>Импорт поставщиков</h1>
          <p>Загружайте прайсы, ставьте товары в очередь и проверяйте результат AI-маппинга.</p>
        </div>
        <button
          className="supplier-import__secondary"
          disabled={busy || loadingInbox}
          onClick={() => void loadInbox()}
          type="button"
        >
          {loadingInbox ? 'Обновление…' : 'Обновить очередь'}
        </button>
        <button
          className="supplier-import__secondary"
          disabled={busy}
          onClick={() => void processQueue()}
          type="button"
        >
          {busy ? 'Обработка…' : 'Обработать пакет очереди'}
        </button>
      </header>

      <div aria-label="Разделы импорта" className="supplier-import__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            id={`supplier-import-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.id === 'inbox' && <span className="supplier-import__count">{imports.length}</span>}
          </button>
        ))}
      </div>

      {message && <p className="supplier-import__notice" role="status">{message}</p>}
      {error && <p className="supplier-import__error" role="alert">{error}</p>}

      <div
        aria-labelledby={`supplier-import-tab-${activeTab}`}
        className="supplier-import__panel"
        role="tabpanel"
      >
        {activeTab === 'files' && (
          <div className="supplier-import__form">
            <h2>Файлы и ссылки</h2>
            <p>Файлы принимаются до 4 МБ; для ссылки используются настройки колонок профиля поставщика.</p>
            <label>
              Поставщик / торговая марка
              <select value={sourceID} onChange={(event) => setSourceID(event.target.value)}>
                <option value="">Выберите профиль поставщика</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            <label>
              Файл прайс-листа (XML, CSV, XLSX, JSON)
              <input
                accept=".xml,.csv,.xlsx,.json"
                disabled={busy}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <div className="supplier-import__separator">или укажите URL</div>
            <label>
              HTTPS-ссылка на прайс-лист
              <input
                autoComplete="url"
                disabled={busy || Boolean(file)}
                onChange={(event) => setPriceURL(event.target.value)}
                placeholder={sources.find((item) => item.id === sourceID)?.supplierFeedURL || 'https://example.com/price.xml'}
                type="url"
                value={priceURL}
              />
            </label>
            <p className="supplier-import__hint">
              Если ссылка не указана, будет использован URL, сохранённый в профиле поставщика. Для введённого вручную URL учётные данные профиля не передаются.
            </p>
            <button
              className="supplier-import__primary"
              disabled={
                busy ||
                !sourceID ||
                (!file && !priceURL.trim() && !sources.find((item) => item.id === sourceID)?.supplierFeedURL)
              }
              onClick={() => void startFileImport()}
              type="button"
            >
              {busy ? 'Запуск импорта…' : 'Запустить импорт'}
            </button>
          </div>
        )}

        {activeTab === 'telegram' && (
          <div className="supplier-import__form">
            <h2>Telegram-каналы</h2>
            <p>
              Укажите канал, дату начала и подготовленные адаптером сообщения. Текущий backend принимает посты для обработки, но сам историю Telegram не скачивает.
            </p>
            <label>
              Ссылка или username канала
              <input
                autoComplete="off"
                disabled={busy}
                onChange={(event) => setChannel(event.target.value)}
                placeholder="@supplier_channel или https://t.me/supplier_channel"
                type="text"
                value={channel}
              />
            </label>
            <label>
              Читать сообщения начиная с даты
              <input
                disabled={busy}
                onChange={(event) => setSince(event.target.value)}
                type="date"
                value={since}
              />
            </label>
            <label>
              Поставщик
              <select value={sourceID} onChange={(event) => setSourceID(event.target.value)}>
                <option value="">Выберите профиль поставщика</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            <label>
              Сообщения, полученные Telegram-адаптером (JSON)
              <textarea
                disabled={busy}
                onChange={(event) => setTelegramPosts(event.target.value)}
                rows={8}
                value={telegramPosts}
              />
            </label>
            <p className="supplier-import__hint">
              Каждый объект должен содержать <code>messageId</code>, <code>date</code>, <code>text</code> и положительную <code>price</code>; также можно передать <code>image</code>, <code>currency</code> и <code>inventory</code>.
            </p>
            <button
              className="supplier-import__primary"
              disabled={busy || !sourceID || !channel.trim()}
              onClick={() => void startTelegramImport()}
              type="button"
            >
              {busy ? 'Синхронизация…' : 'Синхронизировать'}
            </button>
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="supplier-import__inbox">
            <div className="supplier-import__inbox-heading">
              <div>
                <h2>Главный инбокс</h2>
                <p>Одобрение создаёт или обновляет товар в каталоге; неподготовленные записи одобрить нельзя.</p>
              </div>
              <div className="supplier-import__actions">
                <button
                  className="supplier-import__primary"
                  disabled={busy || !selectedIDs.length || selectedIDs.some((id) => {
                    const item = imports.find((record) => record.id === id)
                    return item?.mappingStatus !== 'completed' || !getProductPreview(item?.mappedData)
                  })}
                  onClick={() => void moderateSelected('approved')}
                  type="button"
                >
                  {busy ? 'Обработка…' : 'Одобрить выбранные'}
                </button>
                <button
                  className="supplier-import__danger"
                  disabled={busy || !selectedIDs.length}
                  onClick={() => void moderateSelected('rejected')}
                  type="button"
                >
                  Отклонить
                </button>
              </div>
            </div>

            {loadingInbox ? (
              <p className="supplier-import__empty">Загрузка очереди…</p>
            ) : imports.length === 0 ? (
              <p className="supplier-import__empty">Записей на модерацию пока нет.</p>
            ) : (
              <div className="supplier-import__table-wrap">
                <table className="supplier-import__table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          aria-label="Выбрать все записи"
                          checked={imports.length > 0 && selectedIDs.length === imports.length}
                          disabled={busy}
                          onChange={toggleAll}
                          type="checkbox"
                        />
                      </th>
                      <th>Товар и AI-перевод</th>
                      <th>Цена</th>
                      <th>Поставщик</th>
                      <th>Источник / статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((item) => {
                      const preview = getProductPreview(item.mappedData)
                      const supplier = typeof item.supplierRef === 'object' ? item.supplierRef.name : 'Поставщик'
                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              aria-label={`Выбрать ${preview?.ruTitle || item.id}`}
                              checked={selectedIDs.includes(item.id)}
                              disabled={busy}
                              onChange={() => toggleSelected(item.id)}
                              type="checkbox"
                            />
                          </td>
                          <td>
                            <div className="supplier-import__product">
                              {preview?.image && (
                                <Image
                                  alt=""
                                  height={56}
                                  loading="lazy"
                                  src={preview.image}
                                  unoptimized
                                  width={56}
                                />
                              )}
                              <div>
                                <strong>{preview?.ukTitle || 'AI-перевод ещё не готов'}</strong>
                                <span>{preview?.ruTitle || item.mappingError || 'Запись ожидает обработки очередью'}</span>
                              </div>
                            </div>
                          </td>
                          <td>{preview ? `${preview.price.toLocaleString('ru-RU')} ${preview.currency}` : '—'}</td>
                          <td>{supplier}</td>
                          <td>
                            <span className="supplier-import__source">{item.sourceType}</span>
                            <span className="supplier-import__mapping-status">
                              {item.mappingStatus === 'completed' ? 'AI готов' :
                                item.mappingStatus === 'processing' ? 'Обрабатывается' :
                                  item.mappingStatus === 'failed' ? 'Ошибка маппинга' : 'В очереди'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
