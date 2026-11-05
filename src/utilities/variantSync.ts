import type { CollectionAfterChangeHook, Payload } from 'payload'

// Остаток по умолчанию для новых вариантов (существующие строки не меняем)
export const DEFAULT_STOCK = 100
const MAX_ROWS = 200

type Stored = Record<string, string[]>

export type SyncResult =
  | { status: 'skipped'; reason: string }
  | { status: 'ok'; created: number; removed: number; kept: number; existing: number }

// Все комбинации: [[a, b], [x, y]] → [[a, x], [a, y], [b, x], [b, y]]
const cartesian = (lists: string[][]): string[][] =>
  lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  )

const idOf = (value: unknown): string =>
  typeof value === 'object' && value !== null ? String((value as { id: unknown }).id) : String(value)

// Ключ комбинации: порядок значений не важен
const keyOf = (ids: unknown[]): string => ids.map(idOf).sort().join('|')

// Тип варианта для характеристики. Имя char-<id> стабильное, заголовок для покупателя — публичный
async function ensureType(payload: Payload, ch: any): Promise<string> {
  const name = `char-${ch.id}`
  const label = ch.name_uk || ''
  const found = await payload.find({
    collection: 'variantTypes',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing: any = found.docs[0]
  if (existing) {
    if (existing.label !== label) {
      await payload.update({
        collection: 'variantTypes',
        id: existing.id,
        data: { label },
        overrideAccess: true,
      })
    }
    return String(existing.id)
  }
  const created = await payload.create({
    collection: 'variantTypes',
    data: { name, label },
    overrideAccess: true,
  })
  return String(created.id)
}

// Значение внутри типа. Код v-<id значения> стабильный; подпись обновляется, если изменилась
async function ensureOption(payload: Payload, typeId: string, v: any): Promise<string> {
  const code = `v-${v.id}`
  const label = v.label_uk || v.label_ru || ''
  const found = await payload.find({
    collection: 'variantOptions',
    where: { and: [{ variantType: { equals: typeId } }, { value: { equals: code } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing: any = found.docs[0]
  if (existing) {
    if (existing.label !== label) {
      await payload.update({
        collection: 'variantOptions',
        id: existing.id,
        data: { label },
        overrideAccess: true,
      })
    }
    return String(existing.id)
  }
  const created = await payload.create({
    collection: 'variantOptions',
    data: { variantType: typeId, label, value: code },
    overrideAccess: true,
  })
  return String(created.id)
}

// Есть ли строка в заказах. Если проверка не удалась, считаем, что есть (так безопаснее)
async function isInOrders(payload: Payload, variantID: string): Promise<boolean> {
  try {
    const found = await payload.find({
      collection: 'orders',
      where: { 'items.variant': { equals: variantID } } as any,
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    return found.docs.length > 0
  } catch {
    return true
  }
}

export async function syncVariants(payload: Payload, productId: string): Promise<SyncResult> {
  const product: any = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  const baseSku = typeof product.sku === 'string' ? product.sku.trim() : ''
  if (!baseSku) {
    return { status: 'skipped', reason: 'Спочатку заповніть артикул товару (наприклад SH-001)' }
  }

  // Выбранные значения: { id характеристики: [id значений] }
  const stored: Stored =
    product.attributes && typeof product.attributes === 'object' ? product.attributes : {}
  const variantIds = Object.keys(stored).filter(
    (id) => Array.isArray(stored[id]) && stored[id].length > 1,
  )

  // Характеристики, где выбрано больше одного значения
  const chars: any[] = variantIds.length
    ? (
        await payload.find({
          collection: 'characteristics',
          where: { id: { in: variantIds } },
          limit: 100,
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
      ).docs
    : []
  chars.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const groups: { typeId: string; options: string[] }[] = []
  for (const ch of chars) {
    const typeId = await ensureType(payload, ch)
    const options: string[] = []
    for (const v of ch.values ?? []) {
      const valueId = String(v.id ?? '')
      if (!valueId || !stored[String(ch.id)].includes(valueId)) continue
      options.push(await ensureOption(payload, typeId, v))
    }
    groups.push({ typeId, options })
  }

  const combos = groups.length ? cartesian(groups.map((g) => g.options)) : []
  if (combos.length > MAX_ROWS) {
    return { status: 'skipped', reason: `Комбінацій забагато (${combos.length}). Максимум ${MAX_ROWS}` }
  }

  // Товар: если вариантов нет — выключаем; если есть — включаем и записываем типы.
  // Это делаем ДО создания строк, иначе плагин отклонит строку.
  // context.skipVariantSync не даёт этому сохранению запустить синхронизацию повторно
  await payload.update({
    collection: 'products',
    id: productId,
    data: groups.length
      ? { enableVariants: true, variantTypes: groups.map((g) => g.typeId) }
      : { enableVariants: false, variantTypes: [] },
    draft: product._status !== 'published',
    context: { skipVariantSync: true },
    overrideAccess: true,
  })

  // Уже существующие строки товара
  const existing: any[] = (
    await payload.find({
      collection: 'variants',
      where: { product: { equals: productId } },
      limit: 1000,
      depth: 0,
      pagination: false,
      draft: true,
      overrideAccess: true,
    })
  ).docs

  const prefix = `${baseSku}-`
  const wanted = new Set(combos.map((c) => keyOf(c)))
  const takenKeys = new Set<string>()
  let last = 0
  let removed = 0
  let kept = 0

  for (const d of existing) {
    const sku = typeof d.sku === 'string' ? d.sku : ''
    if (sku.startsWith(prefix)) {
      const n = Number(sku.slice(prefix.length))
      if (Number.isInteger(n) && n > last) last = n
    }

    const key = keyOf(d.options ?? [])
    if (wanted.has(key) && !takenKeys.has(key)) {
      takenKeys.add(key)
      continue
    }

    // Строка больше не нужна: удаляем, только если остатка нет и её не покупали
    const stock = typeof d.inventory === 'number' ? d.inventory : 0
    if (stock === 0 && !(await isInOrders(payload, String(d.id)))) {
      await payload.delete({ collection: 'variants', id: d.id, overrideAccess: true })
      removed += 1
    } else {
      kept += 1
    }
  }

  // Создаём только недостающие комбинации, с остатком по умолчанию
  let created = 0
  for (const combo of combos) {
    if (takenKeys.has(keyOf(combo))) continue
    last += 1
    await payload.create({
      collection: 'variants',
      data: {
        product: productId,
        options: combo,
        sku: `${baseSku}-${String(last).padStart(2, '0')}`,
        inventory: DEFAULT_STOCK,
      } as any,
      overrideAccess: true,
    })
    created += 1
  }

  return { status: 'ok', created, removed, kept, existing: takenKeys.size }
}

// Хук товара: запускается при каждом сохранении (включая черновик)
export const syncVariantsAfterSave: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  // Наше собственное сохранение товара не запускает синхронизацию снова
  if ((context as Record<string, unknown> | undefined)?.skipVariantSync) return doc

  try {
    await syncVariants(req.payload, String(doc.id))
  } catch (err) {
    // Ошибку не показываем в админке при сохранении, а пишем в логи
    req.payload.logger.error({ err, msg: 'Авто-синхронизация вариантов не выполнена' })
  }
  return doc
}