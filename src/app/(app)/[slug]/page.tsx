import type { Metadata } from 'next'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { homeStaticData } from '@/endpoints/seed/home-static'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'

import type { Page } from '@/payload-types'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
    locale?: string
  }>
}

// Главная пустая, если в админке нет ни блоков, ни текста первого экрана
const isHomeEmpty = (page: Page | null) => {
  if (!page) return true

  const hasHeroText = Boolean(page.hero?.richText?.root?.children?.length)
  const hasLayout = Boolean(page.layout?.length)

  return !hasHeroText && !hasLayout
}

export default async function Page({ params }: Args) {
  const { slug = 'home' } = await params
  const requestHeaders = await headers()
  const locale = requestHeaders.get('x-locale') || 'uk'

  let page = await queryPageBySlug({
    slug,
    locale,
  })

  if (slug === 'home' && isHomeEmpty(page)) {
    page = homeStaticData() as unknown as Page
  }

  if (!page) {
    return notFound()
  }

  const { hero, layout } = page

  return (
    <article className="pb-24">
      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = 'home' } = await params
  const requestHeaders = await headers()
  const locale = requestHeaders.get('x-locale') || 'uk'

  let page = await queryPageBySlug({
    slug,
    locale,
  })

  if (slug === 'home' && isHomeEmpty(page)) {
    page = homeStaticData() as unknown as Page
  }

  return generateMeta({ doc: page })
}

const queryPageBySlug = async ({ slug, locale }: { slug: string; locale: string }) => {
  const { isEnabled: draft } = await draftMode()

  if (!draft) {
    return getPublishedPage(slug, locale)
  }

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft: true,
    limit: 1,
    locale: locale as any,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
  })

  return result.docs?.[0] || null
}

const getPublishedPage = unstable_cache(
  async (slug: string, locale: string) => {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'pages',
      draft: false,
      limit: 1,
      locale: locale as any,
      overrideAccess: false,
      pagination: false,
      where: {
        and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
      },
    })

    return result.docs?.[0] || null
  },
  ['published-page'],
  { revalidate: 3600, tags: ['pages'] },
)