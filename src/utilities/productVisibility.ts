import type { Where } from 'payload'

// Товар виден покупателю, если он опубликован и не отмечен «Скрыть от покупателя»
export const visibleProductConditions: Where[] = [
  { _status: { equals: 'published' } },
  { hideFromShop: { not_equals: true } },
]