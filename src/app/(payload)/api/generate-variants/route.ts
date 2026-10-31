import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'

// Защита от случайного огромного числа строк за одно нажатие
const MAX_ROWS = 200

type Stored = Record<string, string[]>
type Opts = { user: any; overrideAccess: false }

// Все комбинации: [[a, b], [x, y]] превращаем в [[a, x], [a, y], [b, x], [b, y]]
const cartesian = (lists: string[][]): string[][] =>
  lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  )

// Ключ комбинации, не зависит от порядка id
const keyOf = (ids: unknown[]): string =>
  ids
    .map((id) => String(typeof id === 'object' && id !== null ? (id as { id: unknown }).id : id))
    .sort()
    .join('|')

// Тип варианта для характеристики. Техническое имя char-<id> не меняется при переименовании
async function ensureType(payload: Payload, ch: any, opts: Opts): Promise<string> {
  const name = `char-${ch.id}`
  const label = ch.adminNote || ch.name_uk
  const found = await payload.find({
    collection: 'variantTypes',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    ...opts,
  })
  const existing: any = found.docs[0]
  if (existing) {
    if (existing.label !== label) {
      await payload.update({ collection: 'variantTypes', id: existing.id, data: { label }, ...opts })
    }
    return String(existing.id)
  }
  const created = await payload.create({
    collection: 'variantTypes',
    data: { name, label },
    ...opts,
  })
  return String(created.id)
}

// Опция (значение) внутри типа. Технический код строим из id значения, он стабильный
async function ensureOption(payload: Payload, typeId: string, v: any, opts: Opts): Promise<string> {
  const code = `v-${v.id}`
  const label = v.label_uk || v.label_ru || ''
  const found = await payload.find({
    collection: 'variantOptions',
    where: {
      and: [{ variantType: { equals: typeId } }, { value: { equals: code } }],
    },
    limit: 1,
    depth: 0,
    ...opts,
  })
  const existing: any = found.docs[0]
  if (existing) {
    if (existing.label !== label) {
      await payload.update({
        collection: 'variantOptions',
        id: existing.id,
        data: { label },
        ...opts,
      })
    }
    return String(existing.id)
  }
  const created = await payload.create({
    collection: 'variantOptions',
    data: { variantType: typeId, label, value: code },
    ...opts,
  })
  return String(created.id)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ error: 'Увійдіть в адмінку' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const productId = typeof body?.productId === 'string' ? body.productId : ''
  if (!productId) {
    return Response.json({ error: 'Не вказано товар' }, { status: 400 })
  }

  // Все действия от имени админа: права проверяет сам Payload
  const opts: Opts = { user, overrideAccess: false }

  const product: any = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    draft: true,
    ...opts,
  })

  const baseSku = typeof product.sku === 'string' ? product.sku.trim() : ''
  if (!baseSku) {
    return Response.json(
      { error: 'Спочатку заповніть артикул товару (наприклад SH-001) і збережіть' },
      { status: 400 },
    )
  }

  // Выбранные значения хранятся в поле attributes: { id характеристики: [id значений] }
  const stored: Stored =
    product.attributes && typeof product.attributes === 'object' ? product.attributes : {}
  const variantIds = Object.keys(stored).filter(
    (id) => Array.isArray(stored[id]) && stored[id].length > 1,
  )
  if (variantIds.length === 0) {
    return Response.json(
      { error: 'Виберіть більше одного значення хоча б в одній характеристиці' },
      { status: 400 },
    )
  }

  const found = await payload.find({
    collection: 'characteristics',
    where: { id: { in: variantIds } },
    limit: 100,
    depth: 0,
    pagination: false,
  })
  const chars = [...found.docs].sort(
    (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
  ) as any[]

  // 1. Тип варианта и опции для каждой характеристики
  const groups: { typeId: string; options: string[] }[] = []
  for (const ch of chars) {
    const typeId = await ensureType(payload, ch, opts)
    const options: string[] = []
    for (const v of ch.values ?? []) {
      const valueId = String(v.id ?? '')
      if (!valueId || !stored[String(ch.id)].includes(valueId)) continue
      options.push(await ensureOption(payload, typeId, v, opts))
    }
    groups.push({ typeId, options })
  }

  // 2. Все комбинации
  const combos = cartesian(groups.map((g) => g.options))
  if (combos.length > MAX_ROWS) {
    return Response.json(
      { error: `Комбінацій забагато (${combos.length}). Максимум ${MAX_ROWS}.` },
      { status: 400 },
    )
  }

  // 3. Товар: включить варианты и записать типы. Это нужно сделать ДО создания строк,
  // иначе плагин отклонит строку (ему нужно по одному значению от каждого типа товара)
  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      enableVariants: true,
      variantTypes: groups.map((g) => g.typeId),
    },
    // Если товар был черновиком, остаётся черновиком; опубликованный не меняем на черновик
    draft: product._status !== 'published',
    ...opts,
  })

  // 4. Уже существующие строки: их не трогаем и не создаём повторно
  const existing = await payload.find({
    collection: 'variants',
    where: { product: { equals: productId } },
    limit: 1000,
    depth: 0,
    pagination: false,
    draft: true,
    ...opts,
  })

  const prefix = `${baseSku}-`
  let last = 0
  const existingKeys = new Set<string>()
  for (const d of existing.docs as any[]) {
    existingKeys.add(keyOf(d.options ?? []))
    const sku = typeof d.sku === 'string' ? d.sku : ''
    if (sku.startsWith(prefix)) {
      const n = Number(sku.slice(prefix.length))
      if (Number.isInteger(n) && n > last) last = n
    }
  }

  const toCreate = combos.filter((c) => !existingKeys.has(keyOf(c)))

  // 5. Создаём строки. Номер артикула — следующий после самого большого
  let created = 0
  try {
    for (const combo of toCreate) {
      last += 1
    await payload.create({
        collection: 'variants',
        data: {
          product: productId,
          options: combo,
          sku: `${baseSku}-${String(last).padStart(2, '0')}`,
        } as any,
        ...opts,
      })
      created += 1
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'невідома помилка'
    return Response.json(
      { error: `Створено ${created} з ${toCreate.length}. Помилка: ${message}`, created },
      { status: 500 },
    )
  }

  return Response.json({
    created,
    skipped: combos.length - toCreate.length,
    types: groups.length,
  })
}