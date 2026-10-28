export type SortFilterItem = {
  reverse: boolean
  slug: null | string
  title: string // название по-украински (по умолчанию)
  titleRu?: string // название по-русски
}

// Название варианта на нужном языке
export const sortTitle = (item: SortFilterItem, locale: 'uk' | 'ru') =>
  locale === 'ru' && item.titleRu ? item.titleRu : item.title

export const defaultSort: SortFilterItem = {
  slug: null,
  reverse: false,
  title: 'За алфавітом А–Я',
  titleRu: 'По алфавиту А–Я',
}

export const sorting: SortFilterItem[] = [
  defaultSort,
  {
    slug: '-createdAt',
    reverse: true,
    title: 'Нові надходження',
    titleRu: 'Новые поступления',
  },
  {
    slug: 'priceInUAH',
    reverse: false, // по возрастанию
    title: 'Ціна: від низької до високої',
    titleRu: 'Цена: по возрастанию',
  },
  {
    slug: '-priceInUAH',
    reverse: true, // по убыванию
    title: 'Ціна: від високої до низької',
    titleRu: 'Цена: по убыванию',
  },
]