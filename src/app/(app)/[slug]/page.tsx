import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import type { Page } from '@/payload-types'
import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { draftMode, headers as getHeaders } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

export const revalidate = 3600

type Locale = 'uk' | 'ru'

type Args = {
  params: Promise<{
    slug: string
  }>
}

// Язык берём из метки, которую ставит proxy
const getLocale = async (): Promise<Locale> => {
  const headers = await getHeaders()
  return headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
}

// Ищем страницу по адресу на нужном языке
const findPage = async (slug: string, locale: Locale, draft: boolean): Promise<Page | null> => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    depth: 2,
    draft,
    limit: 1,
    locale,
    overrideAccess: draft,
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

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const { isEnabled: draft } = await draftMode()
  const page = await findPage(slug, locale, draft)

  if (!page) return {}

  return {
    title: page.meta?.title || page.title,
    description: page.meta?.description || '',
  }
}

export default async function StaticPage({ params }: Args) {
  const { slug } = await params
  const locale = await getLocale()
  const { isEnabled: draft } = await draftMode()
  const page = await findPage(slug, locale, draft)

  if (!page) return notFound()

  const richText = page.hero?.richText

  return (
    <React.Fragment>
      <div className="container pt-8 pb-8">
        <h1 className="mb-6 text-3xl font-medium">{page.title}</h1>
        {richText ? <RichText data={richText} enableGutter={false} /> : null}
      </div>

      {page.layout?.length ? <RenderBlocks blocks={page.layout} /> : null}
    </React.Fragment>
  )
}