import { CategoryPhoto } from '@/components/CategoryPhoto'
import { Grid } from '@/components/Grid'
import { ProductGridItem } from '@/components/ProductGridItem'
import { RichText } from '@/components/RichText'
import type { Media as MediaType } from '@/payload-types'
import { nonEmptyCategoryIds, parentIdOf, subtreeIds } from '@/utilities/categoryTree'
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

const labels = {
  uk: { shop: 'Магазин', empty: 'У цій категорії поки немає товарів.', all: 'Показати всі' },
  ru: { shop: 'Магазин', empty: 'В этой категории пока нет товаров.', all: 'Показать все' },
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

export async function generateMetadata({ params }: Args) {
  const { category: slug } = await params
  const locale = await getLocale()
  const all = await loadCategories(locale)
  const current = all.find((category) => category.slug === slug)

  if (!current) return {}

  const payload = await getPayload({ config: configPromise })
  const nonEmpty = await nonEmptyCategoryIds(payload, all)
  const isEmpty = !nonEmpty.has(String(current.id))

  return {
    title: current.meta?.title || current.title,
    description: current.meta?.description || undefined,
    // Пустую категорию не индексируем
    robots: isEmpty ? { index: false, follow: true } : undefined,
  }
}

export default async function CategoryPage({ params }: Args) {
  const { category: slug } = await params
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
  } as const

  // Свои товары категории (лежат прямо в ней)
  const own = await payload.find({
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
  const ownIds = own.docs.map((product) => product.id)

  // Подкатегории, в которых есть товары
  const children = all.filter(
    (category) => parentIdOf(category) === String(current.id) && nonEmpty.has(String(category.id)),
  )

  // Блоки подкатегорий: до 8 товаров, без повторов тех, что уже показаны выше
  const blocks = await Promise.all(
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

      {current.description ? (
        <RichText
          data={current.description as SerializedEditorState}
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

      {/* 1. Товары самой категории */}
      {own.docs.length > 0 ? (
        <Grid className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {own.docs.map((product, index) => (
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
            <Link href={`/shop/${child.slug}`} className="text-sm underline underline-offset-4">
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
    </div>
  )
}