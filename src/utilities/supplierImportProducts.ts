import type { SupplierProductMapping } from '@/ai/supplierProductMapper'
import type { Payload, RequiredDataFromCollectionSlug, Where } from 'payload'

type RelationshipValue = string | number | { id: string | number } | null | undefined

type SupplierImportRecord = {
  id: string | number
  status?: string | null
  supplierRef?: RelationshipValue
  mappedData?: unknown
  product?: RelationshipValue
}

function relationID(value: RelationshipValue): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object') return value.id
  return undefined
}

function isProductMapping(value: unknown): value is SupplierProductMapping {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SupplierProductMapping>
  return (
    typeof candidate.slug === 'string' &&
    typeof candidate.basePrice === 'number' &&
    candidate.basePrice > 0 &&
    ['UAH', 'USD', 'EUR'].includes(candidate.baseCurrency || '') &&
    typeof candidate.inventory === 'number' &&
    candidate.inventory >= 0 &&
    typeof candidate.supplierSKU === 'string' &&
    Boolean(candidate.uk?.title && candidate.ru?.title)
  )
}

function toRichText(text: string): NonNullable<RequiredDataFromCollectionSlug<'products'>['description']> {
  return {
    root: {
      type: 'root',
      children: text
        ? [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text,
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              version: 1,
            },
          ]
        : [],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

async function findLinkedProduct(
  payload: Payload,
  sourceKey: string,
  mapping: SupplierProductMapping,
) {
  const identity: Where = mapping.supplierProductKey
    ? { supplierProductKey: { equals: mapping.supplierProductKey } }
    : { supplierSKU: { equals: mapping.supplierSKU } }
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [{ supplierSourceKey: { equals: sourceKey } }, identity],
    },
  })
  return found.docs[0]
}

async function uniqueSlug(payload: Payload, slug: string, currentID?: string | number): Promise<string> {
  const existing = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } },
  })
  const product = existing.docs[0]
  if (!product || product.id === currentID) return slug
  return `${slug}-${Date.now().toString(36)}`
}

export async function syncApprovedSupplierImport(
  payload: Payload,
  record: SupplierImportRecord,
): Promise<void> {
  if (record.status !== 'approved') return
  if (!isProductMapping(record.mappedData)) {
    throw new Error(`Запис імпорту ${record.id} не має валідного маппінгу товару.`)
  }
  const sourceID = relationID(record.supplierRef)
  if (sourceID === undefined) throw new Error(`У запису імпорту ${record.id} не вказано постачальника.`)

  const source = await payload.findByID({
    collection: 'import-sources',
    id: sourceID,
    depth: 0,
    overrideAccess: true,
  })
  const mapping = record.mappedData
  const existing =
    (relationID(record.product) !== undefined
      ? await payload.findByID({
          collection: 'products',
          id: relationID(record.product)!,
          depth: 0,
          overrideAccess: true,
        })
      : undefined) || (await findLinkedProduct(payload, source.sourceKey, mapping))

  const data = {
    baseCurrency: mapping.baseCurrency,
    basePrice: mapping.basePrice,
    brand: mapping.brand || undefined,
    gtin: mapping.gtin || undefined,
    inventory: Math.floor(mapping.inventory),
    mpn: mapping.mpn || mapping.supplierSKU || undefined,
    priceInUAH: mapping.baseCurrency === 'UAH' ? mapping.basePrice : undefined,
    slug: existing?.slug || (await uniqueSlug(payload, mapping.slug)),
    supplierImageURL: mapping.supplierImageURL || undefined,
    supplierRef: source.id,
    supplierName: source.name,
    supplierProductKey: mapping.supplierProductKey || undefined,
    supplierSKU: mapping.supplierSKU,
    supplierSourceKey: source.sourceKey,
    title: mapping.uk.title,
    _status: existing?._status || 'draft',
  } satisfies RequiredDataFromCollectionSlug<'products'>

  const product = existing
    ? await payload.update({
        collection: 'products',
        id: existing.id,
        locale: 'uk',
        overrideAccess: true,
        data,
      })
    : await payload.create({
        collection: 'products',
        locale: 'uk',
        overrideAccess: true,
        data,
      })

  await payload.update({
    collection: 'products',
    id: product.id,
    locale: 'uk',
    overrideAccess: true,
    data: {
      description: toRichText(mapping.uk.description),
      meta: mapping.uk.meta,
    },
  })
  await payload.update({
    collection: 'products',
    id: product.id,
    locale: 'ru',
    overrideAccess: true,
    data: {
      title: mapping.ru.title,
      description: toRichText(mapping.ru.description),
      meta: mapping.ru.meta,
    },
  })
  await payload.update({
    collection: 'supplier-imports',
    id: record.id,
    overrideAccess: true,
    data: { product: product.id },
  })
}
