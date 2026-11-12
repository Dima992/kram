import type { Payload } from 'payload'

type Locale = 'uk' | 'ru'

type CharValue = {
  id?: string | null
  label_uk?: string | null
  label_ru?: string | null
}

export type FilterChar = {
  id: number | string
  values?: CharValue[] | null
}

export type ColorCard<T> = {
  product: T
  colorId?: string
  colorLabel?: string
  image?: unknown
}

const idOf = (value: unknown): string =>
  typeof value === 'object' && value !== null
    ? String((value as { id: unknown }).id)
    : String(value)

// Карточки по выбранным значениям характеристик с фото.
// Для каждого выбранного значения, у которого у товара включено «Фото потрібні», — отдельная карточка с его фото.
// Если таких значений нет, товар выводится одной карточкой с главным фото (как раньше).
export async function buildColorCards<
  T extends {
    id: unknown
    gallery?: unknown
    attributes?: unknown
    variantSettings?: unknown
  },
>(
  payload: Payload,
  products: T[],
  chars: FilterChar[],
  selected: Set<string>,
  locale: Locale,
): Promise<ColorCard<T>[]> {
  // Все выбранные значения из всех характеристик
  const picked: { charId: string; valueId: string; label: string }[] = []
  for (const char of chars) {
    for (const value of char.values ?? []) {
      if (!value.id || !selected.has(String(value.id))) continue
      const label =
        locale === 'ru' ? value.label_ru || value.label_uk || '' : value.label_uk || ''
      picked.push({ charId: String(char.id), valueId: String(value.id), label })
    }
  }

  if (picked.length === 0) {
    return products.map((product) => ({ product }))
  }

  // В галерее фото привязано к варианту, а у варианта код вида v-<id значения>
  const codes = picked.map((item) => `v-${item.valueId}`)
  const options = await payload.find({
    collection: 'variantOptions',
    where: { value: { in: codes } },
    limit: 1000,
    pagination: false,
    depth: 0,
  })
  const codeByOption = new Map<string, string>()
  for (const option of options.docs as { id: unknown; value?: unknown }[]) {
    codeByOption.set(String(option.id), String(option.value ?? ''))
  }

  const cards: ColorCard<T>[] = []

  for (const product of products) {
    const attrs =
      product.attributes && typeof product.attributes === 'object'
        ? (product.attributes as Record<string, unknown>)
        : {}
    const settings =
      product.variantSettings && typeof product.variantSettings === 'object'
        ? (product.variantSettings as Record<string, { photos?: boolean } | undefined>)
        : {}
    const gallery = Array.isArray(product.gallery)
      ? (product.gallery as { image?: unknown; variantOption?: unknown }[])
      : []

    let added = false

    for (const item of picked) {
      // Фото по этой характеристике включено только у некоторых товаров
      if (!settings[item.charId]?.photos) continue

      const stored = Array.isArray(attrs[item.charId])
        ? (attrs[item.charId] as unknown[]).map(idOf)
        : []
      if (!stored.includes(item.valueId)) continue

      const row = gallery.find(
        (galleryItem) =>
          galleryItem.image &&
          typeof galleryItem.image === 'object' &&
          galleryItem.variantOption &&
          codeByOption.get(idOf(galleryItem.variantOption)) === `v-${item.valueId}`,
      )

      cards.push({
        product,
        colorId: item.valueId,
        colorLabel: item.label,
        image: row?.image,
      })
      added = true
    }

    // Фото не нашлось: показываем товар одной карточкой с главным фото
    if (!added) cards.push({ product })
  }

  return cards
}