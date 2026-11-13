import { syncVariants } from '@/utilities/variantSync'
import type { Payload } from 'payload'

const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(value)
}

// Убирает характеристику из всех товаров и её варианты.
// Заказы не трогаем: они хранят снимок на момент покупки.
export async function cleanupCharacteristic(payload: Payload, req: any, charId: string) {
  const typeName = `char-${charId}`

  // 1. Тип и его значения
  const types = await payload.find({
    collection: 'variantTypes',
    where: { name: { equals: typeName } },
    limit: 1,
    depth: 0,
    pagination: false,
    draft: true,
    overrideAccess: true,
    req,
  })
  const typeId = types.docs[0] ? String(types.docs[0].id) : null

  const optionIds: string[] = typeId
    ? (
        await payload.find({
          collection: 'variantOptions',
          where: { variantType: { equals: typeId } },
          limit: 500,
          depth: 0,
          pagination: false,
          draft: true,
          overrideAccess: true,
          req,
        })
      ).docs.map((o: any) => String(o.id))
    : []

  // 2. Строки вариантов с этими значениями
  const variants: any[] = optionIds.length
    ? (
        await payload.find({
          collection: 'variants',
          where: { options: { in: optionIds } },
          limit: 1000,
          depth: 0,
          pagination: false,
          draft: true,
          overrideAccess: true,
          req,
        })
      ).docs
    : []

  // 3. Удаляем строки вариантов
  for (const v of variants) {
    await payload.delete({ collection: 'variants', id: v.id, overrideAccess: true, req })
  }

  // 4. Чистим товары
  const products: any[] = (
    await payload.find({
      collection: 'products',
      depth: 0,
      pagination: false,
      draft: true,
      overrideAccess: true,
      req,
    })
  ).docs

  for (const p of products) {
    const attributes: Record<string, unknown> =
      p.attributes && typeof p.attributes === 'object' ? { ...p.attributes } : {}
    const settings: Record<string, unknown> =
      p.variantSettings && typeof p.variantSettings === 'object' ? { ...p.variantSettings } : {}
    const gallery: any[] = Array.isArray(p.gallery) ? p.gallery : []
    const types: string[] = (Array.isArray(p.variantTypes) ? p.variantTypes : [])
      .map(idOf)
      .filter((x: string | null): x is string => Boolean(x))

    const usesAttr = charId in attributes
    const usesSettings = charId in settings
    const usesPhoto = gallery.some((row) => optionIds.includes(idOf(row?.variantOption) ?? ''))
    const usesType = typeId ? types.includes(typeId) : false

    if (!usesAttr && !usesSettings && !usesPhoto && !usesType) continue

    delete attributes[charId]
    delete settings[charId]

    const newGallery = gallery.map((row) =>
      optionIds.includes(idOf(row?.variantOption) ?? '') ? { ...row, variantOption: null } : row,
    )
    const newTypes = typeId ? types.filter((t) => t !== typeId) : types

    await payload.update({
      collection: 'products',
      id: p.id,
      data: {
        attributes,
        variantSettings: settings,
        gallery: newGallery,
        variantTypes: newTypes,
      },
      draft: p._status !== 'published',
      context: { skipVariantSync: true },
      overrideAccess: true,
      req,
    })

    // Пересобираем варианты товара под оставшиеся характеристики
    await syncVariants(payload, String(p.id))
  }

  // 5. Удаляем значения и тип: теперь на них никто не ссылается
  for (const id of optionIds) {
    await payload.delete({ collection: 'variantOptions', id, overrideAccess: true, req })
  }
  if (typeId) {
    await payload.delete({ collection: 'variantTypes', id: typeId, overrideAccess: true, req })
  }
}