import { callAiGateway } from '@/ai/aiGateway'

export type SupplierProductMapping = {
  uk: { title: string; description: string; meta: { title: string; description: string } }
  ru: { title: string; description: string; meta: { title: string; description: string } }
  slug: string
  basePrice: number
  baseCurrency: 'UAH' | 'USD' | 'EUR'
  inventory: number
  supplierSKU: string
  supplierProductKey: string
  supplierImageURL: string
  brand: string
  gtin: string
  mpn: string
}

function parseMapping(response: string): Pick<SupplierProductMapping, 'uk' | 'ru' | 'slug'> {
  const json = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object') throw new Error('AI повернув некоректний JSON-маппінг.')

  const candidate = parsed as Partial<SupplierProductMapping>
  const isLocale = (
    value: SupplierProductMapping['uk'] | undefined,
  ): value is SupplierProductMapping['uk'] =>
    Boolean(
      value &&
        typeof value.title === 'string' &&
        typeof value.description === 'string' &&
        value.meta &&
        typeof value.meta.title === 'string' &&
        typeof value.meta.description === 'string',
    )

  if (!isLocale(candidate.uk) || !isLocale(candidate.ru) || typeof candidate.slug !== 'string') {
    throw new Error('AI повернув неповний маппінг перекладів або SEO.')
  }

  const slug = candidate.slug
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) throw new Error('AI повернув порожній або некоректний slug.')

  return { uk: candidate.uk, ru: candidate.ru, slug }
}

export async function mapSupplierProduct(
  sourceText: string,
  normalized: Omit<SupplierProductMapping, 'uk' | 'ru' | 'slug'>,
): Promise<SupplierProductMapping> {
  const prompt = `Map the supplied product into the following JSON shape only:
{"uk":{"title":"...","description":"...","meta":{"title":"...","description":"..."}},"ru":{"title":"...","description":"...","meta":{"title":"...","description":"..."}},"slug":"lowercase-latin-slug"}
Write natural Ukrainian and Russian text. Preserve factual details; do not invent claims or specifications. Generate SEO titles/descriptions from the supplied facts. The slug must contain only lowercase Latin letters, digits and hyphens.`
  const mapping = parseMapping(await callAiGateway(prompt, sourceText))
  return { ...normalized, ...mapping }
}
