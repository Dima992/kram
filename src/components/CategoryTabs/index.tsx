import configPromise from '@payload-config'
import clsx from 'clsx'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import React, { Suspense } from 'react'

import { nonEmptyCategoryIds } from '@/utilities/categoryTree'
import { Item } from './Item'

async function List() {
  const requestHeaders = await getHeaders()
  const locale = requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const allLabel = locale === 'ru' ? 'Все' : 'Усі'

  const payload = await getPayload({ config: configPromise })
  const categoriesData = await payload.find({
    collection: 'categories',
    locale,
    sort: 'title',
    depth: 0,
    limit: 1000,
    pagination: false,
    select: {
      title: true,
      slug: true,
      parent: true,
    },
  })

  // Прячем пустые категории
  const nonEmpty = await nonEmptyCategoryIds(payload, categoriesData.docs)
  const visible = categoriesData.docs.filter((c) => nonEmpty.has(String(c.id)))

  const categories = visible.map((category) => {
    return {
      href: `/shop/${category.slug}`,
      title: category.title,
    }
  })

  return (
    <React.Fragment>
      <nav>
        <ul className="flex gap-3">
          <Item title={allLabel} href="/shop" />
          <Suspense fallback={null}>
            {categories.map((category) => {
              return <Item {...category} key={category.href} />
            })}
          </Suspense>
        </ul>
      </nav>
    </React.Fragment>
  )
}

const skeleton = 'mb-3 h-4 w-5/6 animate-pulse rounded'
const activeAndTitles = 'bg-neutral-800 dark:bg-neutral-300'
const items = 'bg-neutral-400 dark:bg-neutral-700'

export function CategoryTabs() {
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
      <List />
    </Suspense>
  )
}