import { CategoryPhoto } from '@/components/CategoryPhoto'
import { Grid } from '@/components/Grid'
import { ProductGridItem } from '@/components/ProductGridItem'
import { RichText } from '@/components/RichText'
import type { Media as MediaType } from '@/payload-types'
import { nonEmptyCategoryIds, parentIdOf, subtreeIds } from '@/utilities/categoryTree'
import { buildColorCards } from '@/utilities/colorCards'
import configPromise from '@payload-config'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

export const revalidate = 3600

type Locale = 'uk' | 'ru'

type Args = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ f?: string | string[] }>
}

type CategoryDoc = {
  id: number | string
  slug?: string | null
  title: string
  parent?: unknown
  image?: unknown
  description?: unknown
  meta?: { title?: string | null; description?: string | null } | null
}

type CharacteristicValue = {
  id?: string | null
  label_uk?: string | null
  label_ru?: string | null
}

type CharacteristicDoc = {
  id: number | string
  name_uk: string
  name_ru?: string | null
  categories?: unknown
  googleAttribute?: string | null
  values?: CharacteristicValue[] | null
}

type FilterGroup = { charId: string; valueIds: string[] }

const labels = {
  uk: {
    shop: 'Магазин',
    empty: 'У цій категорії поки немає товарів.',
    all: 'Показати всі',
    clear: 'Скинути фільтр',
    apply: 'Застосувати',
    filter: 'Фільтр',
    found: 'Знайдено товарів: ',
    noMatch: 'За цим фільтром товарів немає.',
  },
  ru: {
    shop: 'Магазин',
    empty: 'В этой категории пока нет товаров.',
    all: 'Показать все',
    clear: 'Сбросить фильтр',
    apply: 'Применить',
    filter: 'Фильтр',
    found: 'Найдено товаров: ',
    noMatch: 'По этому фильтру товаров нет.',
  },
}

const getLocale = async (): Promise<Locale> => {
  const requestHeaders = await getHeaders()
  return requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'
}

// Все категории (их немного)
const loadCategories = async (locale: Locale): Promise<CategoryDoc[]> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'categories',
    locale,
    depth: 1, // depth 1 — чтобы получить фото категории
    limit: 1000,
    pagination: false,
    sort: 'title',
  })
  return result.docs as CategoryDoc[]
}

// Цепочка от верхнего уровня до текущей категории (для хлебных крошек)
const breadcrumbChain = (current: CategoryDoc, byId: Map<string, CategoryDoc>) => {
  const chain: CategoryDoc[] = [current]
  let parentId = parentIdOf(current)
  let guard = 0
  while (parentId && byId.get(parentId) && guard < 10) {
    const parent = byId.get(parentId) as CategoryDoc
    chain.unshift(parent)
    parentId = parentIdOf(parent)
    guard++
  }
  return chain
}

const photoOf = (value: unknown): MediaType | null =>
  value && typeof value === 'object' ? (value as MediaType) : null

// Выбранные значения фильтра из адреса: ?f=id1&f=id2 (также поддерживаем старый вид ?f=id1,id2)
const parseSelected = (raw: string | string[] | undefined): Set<string> => {
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : []
  return new Set(
    parts
      .flatMap((part) => part.split(','))
      .map((part) => part.trim())
      .filter(Boolean),
  )
}

const idsOfRelation = (relation: unknown): string[] =>
  Array.isArray(relation)
    ? relation.map((item) =>
        typeof item === 'object' && item !== null
          ? String((item as { id: unknown }).id)
          : String(item),
      )
    : []

const idOfValue = (value: unknown): string =>
  typeof value === 'object' && value !== null
    ? String((value as { id: unknown }).id)
    : String(value)

const attrsOf = (attributes: unknown): Record<string, unknown> =>
  attributes && typeof attributes === 'object' && !Array.isArray(attributes)
    ? (attributes as Record<string, unknown>)
    : {}

// Сколько товаров у каждого значения характеристики (без учёта выбора; нужно, чтобы понять, какие значения показывать)
const countValues = (docs: { attributes?: unknown }[]): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const product of docs) {
    const ids = new Set<string>()
    for (const stored of Object.values(attrsOf(product.attributes))) {
      if (Array.isArray(stored)) stored.forEach((value) => ids.add(idOfValue(value)))
    }
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  }
  return counts
}

// Товар подходит, если по каждой выбранной характеристике у него есть хотя бы одно выбранное значение
const matchesFilter = (product: { attributes?: unknown }, groups: FilterGroup[]) => {
  const attrs = attrsOf(product.attributes)
  return groups.every((group) => {
    const stored = Array.isArray(attrs[group.charId])
      ? (attrs[group.charId] as unknown[]).map(idOfValue)
      : []
    return stored.some((id) => group.valueIds.includes(id))
  })
}

// Умный счётчик: для одной характеристики считаем товары, которые подходят под выбор во всех ДРУГИХ характеристиках
const countForChar = (
  docs: { attributes?: unknown }[],
  groups: FilterGroup[],
  charId: string,
): Map<string, number> => {
  const others = groups.filter((group) => group.charId !== charId)
  const counts = new Map<string, number>()
  for (const product of docs) {
    if (!matchesFilter(product, others)) continue
    const stored = attrsOf(product.attributes)[charId]
    if (!Array.isArray(stored)) continue
    new Set(stored.map(idOfValue)).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  }
  return counts
}

// Есть ли в описании хоть какой-то текст
const hasText = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false
  const n = node as { text?: unknown; children?: unknown[] }
  if (typeof n.text === 'string' && n.text.trim() !== '') return true
  return Array.isArray(n.children) && n.children.some(hasText)
}

// Описание для языка страницы. На русском без своего текста не берём украинский
const descriptionFor = async (categoryId: number | string, locale: Locale, fallback: unknown) => {
  if (locale !== 'ru') return fallback
  const payload = await getPayload({ config: configPromise })
  const doc = await payload.findByID({
    collection: 'categories',
    id: categoryId,
    locale: 'ru',
    fallbackLocale: false,
    depth: 0,
  })
  return hasText(doc.description) ? doc.description : null
}

export async function generateMetadata({ params, searchParams }: Args) {
  const { category: slug } = await params
  const { f } = await searchParams
  const locale = await getLocale()
  const all = await loadCategories(locale)
  const current = all.find((category) => category.slug === slug)

  if (!current) return {}

  const payload = await getPayload({ config: configPromise })
  const nonEmpty = await nonEmptyCategoryIds(payload, all)
  const isEmpty = !nonEmpty.has(String(current.id))
  // Пустую категорию и страницу с фильтром не индексируем (чтобы не было дублей)
  const noindex = isEmpty || Boolean(f)

  return {
    title: current.meta?.title || current.title,
    description: current.meta?.description || undefined,
    robots: noindex ? { index: false, follow: true } : undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: Args) {
  const { category: slug } = await params
  const { f } = await searchParams
  const locale = await getLocale()
  const all = await loadCategories(locale)
  const current = all.find((category) => category.slug === slug)

  if (!current) return notFound()

  const byId = new Map(all.map((category) => [String(category.id), category]))
  const chain = breadcrumbChain(current, byId)

  const payload = await getPayload({ config: configPromise })
  const nonEmpty = await nonEmptyCategoryIds(payload, all)

  const productSelect = {
    title: true,
    slug: true,
    gallery: true,
    categories: true,
    baseCurrency: true,
    basePrice: true,
    priceInUAH: true,
    attributes: true,
    variantSettings: true,
  } as const

  const selected = parseSelected(f)
  const filterActive = selected.size > 0

  // Характеристики, которые действуют на эту категорию (и на её родителей).
  // Без категорий — действуют на весь магазин.
  const chainIds = new Set(chain.map((category) => String(category.id)))
  const { docs: characteristicDocs } = await payload.find({
    collection: 'characteristics',
    limit: 1000,
    pagination: false,
    sort: 'order',
    depth: 0,
  })
  const filterChars = (characteristicDocs as CharacteristicDoc[]).filter((characteristic) => {
    const cats = idsOfRelation(characteristic.categories)
    return cats.length === 0 || cats.some((id) => chainIds.has(id))
  })

  // Все товары категории со всеми подкатегориями: нужны для фильтра и счётчиков
  const subtree = subtreeIds(String(current.id), all)
  const candidates = await payload.find({
    collection: 'products',
    locale,
    draft: false,
    overrideAccess: false,
    pagination: false,
    sort: 'title',
    select: productSelect,
    where: {
      and: [{ _status: { equals: 'published' } }, { categories: { in: subtree } }],
    },
  })

  // Показываем только значения, которые есть у товаров этой категории
  const totalCounts = countValues(candidates.docs)
  const visibleChars = filterChars
    .map((characteristic) => ({
      characteristic,
      values: (characteristic.values ?? []).filter(
        (value) => value.id && (totalCounts.get(String(value.id)) ?? 0) > 0,
      ),
    }))
    .filter((item) => item.values.length > 0)

  const groups: FilterGroup[] = visibleChars
    .map(({ characteristic, values }) => ({
      charId: String(characteristic.id),
      valueIds: values
        .filter((value) => selected.has(String(value.id)))
        .map((value) => String(value.id)),
    }))
    .filter((group) => group.valueIds.length > 0)

  const filtered = filterActive
    ? candidates.docs.filter((product) => matchesFilter(product, groups))
    : []

  // Карточки с фото: по выбранным значениям любой характеристики, у которой включено «Фото потрібні»
  const cards = filterActive
    ? await buildColorCards(payload, filtered, filterChars, selected, locale)
    : []

  // Свои товары категории и блоки подкатегорий: только когда фильтр выключен
  const ownResult = filterActive
    ? null
    : await payload.find({
        collection: 'products',
        locale,
        draft: false,
        overrideAccess: false,
        limit: 100,
        sort: 'title',
        select: productSelect,
        where: {
          and: [{ _status: { equals: 'published' } }, { categories: { in: [current.id] } }],
        },
      })
  const ownDocs = ownResult?.docs ?? []
  const ownIds = ownDocs.map((product) => product.id)

  // Подкатегории, в которых есть товары
  const children = all.filter(
    (category) => parentIdOf(category) === String(current.id) && nonEmpty.has(String(category.id)),
  )

  // Блоки подкатегорий: до 8 товаров, без повторов тех, что уже показаны выше
  const blocks = filterActive
    ? []
    : await Promise.all(
        children.map(async (child) => {
          const ids = subtreeIds(String(child.id), all)
          const result = await payload.find({
            collection: 'products',
            locale,
            draft: false,
            overrideAccess: false,
            limit: 8,
            sort: 'title',
            select: productSelect,
            where: {
              and: [
                { _status: { equals: 'published' } },
                { categories: { in: ids } },
                ...(ownIds.length ? [{ id: { not_in: ownIds } }] : []),
              ],
            },
          })
          return { child, products: result.docs }
        }),
      )
  const visibleBlocks = blocks.filter((block) => block.products.length > 0)

  const photo = photoOf(current.image)
  const description = await descriptionFor(current.id, locale, current.description)

  const filterForm = visibleChars.length > 0 ? (
    <form method="get" action={`/shop/${current.slug}`}>
      {visibleChars.map(({ characteristic, values }) => {
        const charId = String(characteristic.id)
        const title =
          locale === 'ru' ? characteristic.name_ru || characteristic.name_uk : characteristic.name_uk
        const chosenCount = values.filter((value) => selected.has(String(value.id))).length
        // Счётчики этой характеристики с учётом выбора в остальных
        const facet = countForChar(candidates.docs, groups, charId)

        return (
          <div key={charId} className="border-b border-black/10 py-4 dark:border-white/10">
            {/* На телефоне характеристика свёрнута, на ПК всегда открыта */}
            <input type="checkbox" id={`cf-${charId}`} className="peer hidden" />
            <label
              htmlFor={`cf-${charId}`}
              className="flex cursor-pointer items-center justify-between text-sm font-medium md:pointer-events-none md:cursor-default"
            >
              <span>
                {title}
                {chosenCount > 0 ? ` · ${chosenCount}` : ''}
              </span>
              <span className="md:hidden">▼</span>
            </label>

            <ul className="mt-3 hidden flex-col gap-2 peer-checked:flex md:flex">
              {values.map((value) => {
                const id = String(value.id)
                const isOn = selected.has(id)
                const count = facet.get(id) ?? 0
                const text =
                  locale === 'ru'
                    ? value.label_ru || value.label_uk || ''
                    : value.label_uk || ''
                return (
                  <li key={id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2 text-sm ${
                        count === 0 && !isOn ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="f"
                        value={id}
                        defaultChecked={isOn}
                        className="h-4 w-4"
                      />
                      <span>{text}</span>
                      <span className="ml-auto text-black/50 dark:text-white/50">({count})</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="submit"
          className="rounded border border-black bg-black px-4 py-2 text-sm text-white dark:border-white dark:bg-white dark:text-black"
        >
          {labels[locale].apply}
        </button>
        {filterActive ? (
          <Link
            href={`/shop/${current.slug}`}
            className="text-center text-sm underline underline-offset-4"
          >
            {labels[locale].clear}
          </Link>
        ) : null}
      </div>
    </form>
  ) : null

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/shop" className="hover:underline">
              {labels[locale].shop}
            </Link>
          </li>
          {chain.map((category, index) => (
            <li key={String(category.id)} className="flex items-center gap-2">
              <span>/</span>
              {index === chain.length - 1 ? (
                <span aria-current="page" className="font-medium">
                  {category.title}
                </span>
              ) : (
                <Link href={`/shop/${category.slug}`} className="hover:underline">
                  {category.title}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {photo ? (
        <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-lg md:aspect-[3/1]">
          <CategoryPhoto photo={photo} sizes="100vw" priority />
        </div>
      ) : null}

      <h1 className="mb-6 text-3xl font-medium">{current.title}</h1>

      {description ? (
        <RichText
          data={description as SerializedEditorState}
          enableGutter={false}
          className="mb-8"
        />
      ) : null}

      {/* Плитки подкатегорий: сразу видно, что внутри */}
      {children.length > 0 ? (
        <ul className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {children.map((child) => {
            const childPhoto = photoOf(child.image)
            return (
              <li key={String(child.id)}>
                <Link href={`/shop/${child.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    {childPhoto ? (
                      <CategoryPhoto
                        photo={childPhoto}
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="transition duration-300 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium group-hover:underline">{child.title}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
        {/* Фильтр: на ПК слева всегда виден, на телефоне открывается по нажатию */}
        {filterForm ? (
          <aside className="mb-8 md:sticky md:top-24 md:mb-0 md:self-start">
            <input type="checkbox" id="filter-toggle" className="peer hidden" />
            <label
              htmlFor="filter-toggle"
              className="mb-4 flex w-full cursor-pointer items-center justify-between rounded border border-black/30 px-4 py-3 text-sm md:hidden dark:border-white/30"
            >
              <span>{labels[locale].filter}</span>
              <span>▼</span>
            </label>
            <div className="hidden peer-checked:block md:block">{filterForm}</div>
          </aside>
        ) : null}

        <div className="min-w-0">
          {filterActive ? (
            <>
              <p className="mb-4 text-sm">
                {labels[locale].found}
                {filtered.length}
              </p>
              {cards.length > 0 ? (
                <Grid className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card, index) => {
                    // Ищем характеристику, к которой относится значение (например, цвет или размер)
                    const charOf = (id: string) =>
                      String(
                        filterChars.find((characteristic) =>
                          (characteristic.values ?? []).some((value) => String(value.id) === id),
                        )?.id ?? '',
                      )

                    // Для карточки с цветом: её цвет + выбранные значения ДРУГИХ характеристик (размер).
                    // Другие цвета в ссылку не попадают, иначе страница товара выберет не тот.
                    const cardChar = card.colorId ? charOf(card.colorId) : ''
                    const otherSelected = Array.from(selected).filter(
                      (id) => !cardChar || charOf(id) !== cardChar,
                    )
                    const valueIds = card.colorId ? [card.colorId, ...otherSelected] : otherSelected

                    return (
                      <ProductGridItem
                        key={`${String(card.product.id)}-${card.colorId ?? 'main'}`}
                        locale={locale}
                        priority={index === 0}
                        product={card.product}
                        colorLabel={card.colorLabel}
                        imageOverride={card.image as MediaType | undefined}
                        valueIds={valueIds}
                      />
                    )
                  })}
                </Grid>
              ) : (
                <p className="mb-12">{labels[locale].noMatch}</p>
              )}
            </>
          ) : (
            <>
              {/* 1. Товары самой категории */}
              {ownDocs.length > 0 ? (
                <Grid className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ownDocs.map((product, index) => (
                    <ProductGridItem
                      key={product.id}
                      locale={locale}
                      priority={index === 0}
                      product={product}
                    />
                  ))}
                </Grid>
              ) : visibleBlocks.length === 0 ? (
                <p className="mb-4">{labels[locale].empty}</p>
              ) : null}

              {/* 2. Блоки подкатегорий с товарами */}
              {visibleBlocks.map(({ child, products }) => (
                <section key={String(child.id)} className="mb-12">
                  <div className="mb-4 flex items-baseline justify-between gap-4">
                    <h2 className="text-2xl font-medium">{child.title}</h2>
                    <Link
                      href={`/shop/${child.slug}`}
                      className="text-sm underline underline-offset-4"
                    >
                      {labels[locale].all}
                    </Link>
                  </div>
                  <Grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <ProductGridItem
                        key={product.id}
                        locale={locale}
                        priority={false}
                        product={product}
                      />
                    ))}
                  </Grid>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}