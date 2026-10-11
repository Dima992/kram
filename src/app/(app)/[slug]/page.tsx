import type { Metadata } from 'next'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { Storefront } from '@/components/Storefront'
import { homeStaticData } from '@/endpoints/seed/home-static'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import configPromise from '@payload-config'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

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

const hasPageContent = (page: Page | null) => {
  if (!page) return false

  const hasHeroContent = Boolean(
    page.hero.richText?.root.children.length || page.hero.links?.length || page.hero.media,
  )
  const hasLayoutContent = page.layout.some(
    (block) =>
      block.blockType !== 'content' ||
      block.columns?.some((column) => column.richText?.root.children.length || column.enableLink),
  )

  return hasHeroContent || hasLayoutContent
}

export default async function Page({ params }: Args) {
  const { slug = 'home' } = await params
  const requestHeaders = await headers()
  const locale = requestHeaders.get('x-locale') || 'uk'

  let page = await queryPageBySlug({
    slug,
    locale,
  })

  const hasCustomPageContent = hasPageContent(page)

  if (slug === 'home' && !hasCustomPageContent) {
    page = homeStaticData() as unknown as Page
  }

  if (!page) {
    return notFound()
  }

  const { hero, layout } = page

  return (
    <article className="pb-24">
      {slug === 'home' && <Storefront locale={locale === 'ru' ? 'ru' : 'uk'} />}
      {slug !== 'home' || hasCustomPageContent ? (
        <>
          <RenderHero {...hero} />
          <RenderBlocks blocks={layout} />
        </>
      ) : null}
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

  const hasCustomPageContent = hasPageContent(page)

  if (slug === 'home' && !hasCustomPageContent) {
    page = homeStaticData() as unknown as Page
  }

  const metadata = await generateMeta({ doc: page })

  if (slug !== 'home' || hasCustomPageContent) {
    return metadata
  }

  return {
    ...metadata,
    description:
      locale === 'ru'
        ? 'Текстиль и вещи для дома, создающие уют каждый день.'
        : 'Текстиль і речі для дому, що створюють затишок щодня.',
    title: locale === 'ru' ? 'Уют начинается дома' : 'Затишок починається вдома',
  }
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
