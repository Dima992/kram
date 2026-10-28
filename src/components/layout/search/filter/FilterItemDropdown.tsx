'use client'

import { sortTitle } from '@/lib/constants'
import { ChevronDownIcon } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { ListItem } from '.'

import { FilterItem } from './FilterItem'

export function FilterItemDropdown({ list }: { list: ListItem[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState('')
  const [openSelect, setOpenSelect] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Язык определяем по адресу: /ru — русский, остальное — украинский
  const locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uk'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSelect(false)
      }
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    list.forEach((listItem: ListItem) => {
      if ('path' in listItem) {
        if (pathname === listItem.path) setActive(listItem.title)
      } else if (searchParams.get('sort') === listItem.slug) {
        setActive(sortTitle(listItem, locale))
      }
    })
  }, [pathname, list, searchParams, locale])

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex w-full items-center justify-between rounded border border-black/30 px-4 py-2 text-sm dark:border-white/30"
        onClick={() => {
          setOpenSelect(!openSelect)
        }}
      >
        <div>{active}</div>
        <ChevronDownIcon className="h-4" />
      </div>
      {openSelect && (
        <div
          className="absolute z-40 w-full rounded-b-md bg-white p-4 shadow-md dark:bg-black"
          onClick={() => {
            setOpenSelect(false)
          }}
        >
          {list.map((item: ListItem, i) => (
            <FilterItem item={item} key={i} />
          ))}
        </div>
      )}
    </div>
  )
}