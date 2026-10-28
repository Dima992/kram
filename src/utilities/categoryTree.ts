import type { Payload } from 'payload';

export type CategoryNode = { id: number | string; parent?: unknown }

// Id родителя (или пустая строка, если верхний уровень)
export const parentIdOf = (c: CategoryNode): string => {
  const p = c.parent
  if (p === null || p === undefined || p === '') return ''
  if (typeof p === 'object') return String((p as { id?: unknown }).id ?? '')
  return String(p)
}

// Сама категория и все её подкатегории (на любой глубине)
export const subtreeIds = (rootId: string, all: CategoryNode[]): string[] => {
  const keep = new Set<string>([rootId])
  let added = true
  while (added) {
    added = false
    for (const c of all) {
      const parent = parentIdOf(c)
      if (parent && keep.has(parent) && !keep.has(String(c.id))) {
        keep.add(String(c.id))
        added = true
      }
    }
  }
  return Array.from(keep)
}

// Категории, в которых есть товары: сама категория или любая её подкатегория
export const nonEmptyCategoryIds = async (
  payload: Payload,
  all: CategoryNode[],
): Promise<Set<string>> => {
  const products = await payload.find({
    collection: 'products',
    draft: false,
    limit: 5000,
    pagination: false,
    depth: 0,
    select: { categories: true },
    where: { _status: { equals: 'published' } },
  })

  const byId = new Map(all.map((c) => [String(c.id), c]))
  const result = new Set<string>()

  for (const product of products.docs) {
    for (const item of (product.categories ?? []) as unknown[]) {
      let current =
        typeof item === 'object' && item !== null
          ? String((item as { id: unknown }).id)
          : String(item)
      let guard = 0
      // Поднимаемся от категории товара до верхнего уровня
      while (current && guard < 10) {
        result.add(current)
        const node = byId.get(current)
        current = node ? parentIdOf(node) : ''
        guard++
      }
    }
  }

  return result
}