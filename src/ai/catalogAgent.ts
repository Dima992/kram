'use server';

import { callAiGateway } from './aiGateway';

export interface ProductTranslation {
  title: string
  description: string
  meta: {
    title: string
    description: string
  }
}

export interface ProductTranslations {
  uk: ProductTranslation
  ru: ProductTranslation
  slug: string
}

function parseProductTranslations(response: string): ProductTranslations {
  const json = response
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed: unknown = JSON.parse(json)

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned an invalid response.')
  }

  const value = parsed as Partial<ProductTranslations>
  const isTranslation = (translation: ProductTranslation | undefined): translation is ProductTranslation =>
    Boolean(
      translation &&
        typeof translation.title === 'string' &&
        typeof translation.description === 'string' &&
        translation.meta &&
        typeof translation.meta.title === 'string' &&
        typeof translation.meta.description === 'string',
    )

  if (!isTranslation(value.uk) || !isTranslation(value.ru) || typeof value.slug !== 'string') {
    throw new Error('AI returned incomplete translations. Please try again.')
  }

  const slug = value.slug
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new Error('AI returned an invalid product slug. Please try again.')
  }

  return { uk: value.uk, ru: value.ru, slug }
}

export async function generateProductTranslations(rawText: string) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { result: null, error: 'Вставте текст опису товару.' }
  }

  if (rawText.length > 20_000) {
    return { result: null, error: 'Текст опису не повинен перевищувати 20 000 символів.' }
  }

  const systemPrompt = `You are an ecommerce product copywriter. Return only valid JSON, with no markdown or surrounding text, in exactly this shape:
{
  "uk": {
    "title": "Ukrainian product title",
    "description": "Ukrainian product description as plain text",
    "meta": {
      "title": "Ukrainian SEO title",
      "description": "Ukrainian SEO description"
    }
  },
  "ru": {
    "title": "Russian product title",
    "description": "Russian product description as plain text",
    "meta": {
      "title": "Russian SEO title",
      "description": "Russian SEO description"
    }
  },
  "slug": "shared-latin-url-slug"
}
Preserve factual details from the source. Do not invent specifications, certifications, or product claims. Write the Ukrainian and Russian texts naturally. The slug must contain lowercase Latin letters, digits, and hyphens only.`

  try {
    const response = await callAiGateway(systemPrompt, rawText.trim())
    return { result: parseProductTranslations(response), error: null }
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Не вдалося згенерувати опис товару.',
    }
  }
}

interface CatalogAgentPayload {
  productTitle?: string
  productDescription?: string
  categoryName?: string
}

export async function generateCatalogContent(data: CatalogAgentPayload) {
  const systemPrompt = 'You are a helpful catalog assistant. Generate text for products and a unique slug based on input data.'
  const userMessage = `Generate text for product: ${data.productTitle || ''}, description: ${data.productDescription || ''}, category: ${data.categoryName || ''}. Also generate a unique slug.`

  try {
    const result = await callAiGateway(systemPrompt, userMessage);
    return { result, error: undefined as string | undefined };
  } catch (error) {
    return {
      result: '',
      error: error instanceof Error ? error.message : 'Error generating catalog content',
    };
  }
}