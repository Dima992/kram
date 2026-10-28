'use client'

import { cn } from '@/utilities/cn'
import { createUrl } from '@/utilities/createUrl'
import { SearchIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

type Props = {
  className?: string
}

export const Search: React.FC<Props> = ({ className }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Язык определяем по адресу: /ru — русский, остальное — украинский
  const isRu = pathname === '/ru' || pathname.startsWith('/ru/')
  const placeholder = isRu ? 'Поиск товаров...' : 'Пошук товарів...'

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const val = e.target as HTMLFormElement
    const search = val.search as HTMLInputElement
    const newParams = new URLSearchParams(searchParams.toString())

    if (search.value) {
      newParams.set('q', search.value)
    } else {
      newParams.delete('q')
    }

    router.push(createUrl('/shop', newParams))
  }

  return (
    <form className={cn('relative w-full', className)} onSubmit={onSubmit}>
      <input
        autoComplete="off"
        className="w-full rounded-lg border-2 border-neutral-400 bg-white px-4 py-2.5 pr-12 text-sm text-black shadow-sm transition placeholder:text-neutral-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400 dark:focus:border-blue-400 dark:focus:ring-blue-900"
        defaultValue={searchParams?.get('q') || ''}
        key={searchParams?.get('q')}
        name="search"
        placeholder={placeholder}
        type="text"
      />
      <div className="absolute right-0 top-0 mr-4 flex h-full items-center">
        <SearchIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
      </div>
    </form>
  )
}