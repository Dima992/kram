import { Grid } from '@/components/Grid'
import { Media } from '@/components/Media'
import { ProductGridItem } from '@/components/ProductGridItem'
import { RichText } from '@/components/RichText'
import type { Media as MediaType } from '@/payload-types'
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
  uk: { shop: 'Магазин', empty: 'У цій категорії поки немає товарів.' },
  ru: { shop: 'Магазин', empty: 'В этой категории пока нет товаров.' },
}

const getLocale = async (): Promise<Locale> => {
  const requestHeaders = await getHeaders()
  return requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'
}

// Все категории (их немного): нужны, чтобы найти подкатегории и хлебные крошки
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

// Id родительской категории (или null, если это верхний уровень)
const parentIdOf = (category: CategoryDoc): string | null => {
  if (category.parent === null || category.parent === undefined) return null
  if (typeof category.parent === 'object') {
    const parent = category.parent as { id?: unknown }
    return parent.id !== undefined ? String(parent.id) : null
  }
  return String(category.parent)
}

// Сама категория и все её подкатегории (на любой глубине)
const collectCategoryIds = (root: CategoryDoc, all: CategoryDoc[]) => {
  const keep = new Set<string>([String(root.id)])
  let added = true
  while (added) {
    added = false
    for (const category of all) {
      const parentId = parentIdOf(category)
      if (parentId && keep.has(parentId) && !keep.has(String(category.id))) {
        keep.add(String(category.id))
        added = true
      }
    }
  }
  return all.filter((category) => keep.has(String(category.id))).map((category) => category.id)
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

export async function generateMetadata({ params }: Args) {
  const { category: slug } = await params
  const locale = await getLocale()
  const all = await loadCategories(locale)
  const current = all.find((category) => category.slug === slug)

  if (!current) return {}

  return {
    title: current.meta?.title || current.title,
    description: current.meta?.description || undefined,
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
  const categoryIds = collectCategoryIds(current, all)

  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    locale,
    draft: false,
    overrideAccess: false,
    limit: 100,
    sort: 'title',
    select: {
      title: true,
      slug: true,
      gallery: true,
      categories: true,
      baseCurrency: true,
      basePrice: true,
      priceInUAH: true,
    },
    where: {
      and: [
        { _status: { equals: 'published' } },
        { categories: { in: categoryIds } },
      ],
    },
  })

  const photo =
    current.image && typeof current.image === 'object' ? (current.image as MediaType) : null

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
        <Media resource={photo} className="mb-6" imgClassName="w-full max-h-72 rounded-lg object-cover" size="100vw" />
      ) : null}

      <h1 className="mb-6 text-3xl font-medium">{current.title}</h1>

      {current.description ? (
        <RichText
          data={current.description as SerializedEditorState}
          enableGutter={false}
          className="mb-8"
        />
      ) : null}

      {products.docs.length === 0 ? (
        <p className="mb-4">{labels[locale].empty}</p>
      ) : (
        <Grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.docs.map((product, index) => (
            <ProductGridItem
              key={product.id}
              locale={locale}
              priority={index === 0}
              product={product}
            />
          ))}
        </Grid>
      )}
    </div>
  )
}