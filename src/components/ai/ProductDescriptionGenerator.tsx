'use client'

import { useForm } from '@payloadcms/ui'
import { useState } from 'react'
import { generateProductTranslations, type ProductTranslations } from '@/ai/catalogAgent'

function toLexicalDescription(description: string) {
  const paragraphs = description
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      children: [
        {
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text,
          type: 'text',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'paragraph',
      version: 1,
    }))

  return {
    root: {
      children: paragraphs,
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

function updateFormFields(translations: ProductTranslations, dispatchFields: ReturnType<typeof useForm>['dispatchFields']) {
  for (const locale of ['uk', 'ru'] as const) {
    const translation = translations[locale]
    const localizedValues = {
      title: translation.title,
      description: toLexicalDescription(translation.description),
      'meta.title': translation.meta.title,
      'meta.description': translation.meta.description,
    }

    for (const [field, value] of Object.entries(localizedValues)) {
      dispatchFields({
        type: 'UPDATE',
        path: `${field}.${locale}`,
        value,
      })
    }
  }

  dispatchFields({
    type: 'UPDATE',
    path: 'slug',
    value: translations.slug,
  })
}

export function ProductDescriptionGenerator() {
  const { dispatchFields } = useForm()
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await generateProductTranslations(rawText)

      if (response.error) {
        setError(response.error)
        return
      }

      if (!response.result) {
        setError('Не вдалося отримати переклади від ШІ.')
        return
      }

      updateFormFields(response.result, dispatchFields)
      setSuccess('Поля товару заповнено українською та російською. Перевірте результат і збережіть товар.')
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Не вдалося згенерувати опис товару.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <label htmlFor="product-description-source">Чернетка опису товару</label>
      <textarea
        id="product-description-source"
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        placeholder="Вставте сюди опис від постачальника або чернетку"
        rows={6}
        maxLength={20_000}
        disabled={loading}
        style={{ display: 'block', width: '100%', marginTop: '0.5rem', marginBottom: '0.75rem' }}
      />
      <button type="button" onClick={() => void generate()} disabled={loading || !rawText.trim()}>
        {loading ? 'Генерую…' : 'Сгенерировать с ИИ'}
      </button>
      {loading && <span role="status" style={{ marginInlineStart: '0.75rem' }}>Зачекайте, триває генерація…</span>}
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  )
}
