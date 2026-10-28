import configPromise from '@payload-config'
import clsx from 'clsx'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import { Suspense } from 'react'

import { CategoryTree } from './Categories.client'

async function CategoryList() {
  const requestHeaders = await getHeaders()
  const locale = requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const heading = locale === 'ru' ? 'Категории' : 'Категорії'

  const payload = await getPayload({ config: configPromise })

  const categories = await payload.find({
    collection: 'categories',
    locale,
    sort: 'title',
    depth: 0,
    limit: 1000,
    pagination: false,
  })

  return (
    <div>
      <h3 className="text-xs mb-2 text-neutral-500 dark:text-neutral-400">{heading}</h3>
      <CategoryTree categories={categories.docs} />
    </div>
  )
}

const skeleton = 'mb-3 h-4 w-5/6 animate-pulse rounded'
const activeAndTitles = 'bg-neutral-800 dark:bg-neutral-300'
const items = 'bg-neutral-400 dark:bg-neutral-700'

export function Categories() {
  return (
    <Suspense
      fallback={
        <div className="col-span-2 hidden h-[400px] w-full flex-none py-4 lg:block">
          <div className={clsx(skeleton, activeAndTitles)} />
          <div className={clsx(skeleton, activeAndTitles)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
          <div className={clsx(skeleton, items)} />
        </div>
      }
    >
      <CategoryList />
    </Suspense>
  )
}