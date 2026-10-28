'use client'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Category } from '@/payload-types'

type Props = {
  category: Category
}

// Старый вариант: фильтр на той же странице (оставлен, на случай если где-то используется)
export const CategoryItem: React.FC<Props> = ({ category }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = useMemo(() => {
    return searchParams.get('category') === String(category.id)
  }, [category.id, searchParams])

  const setQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (isActive) {
      params.delete('category')
    } else {
      params.set('category', String(category.id))
    }

    const newParams = params.toString()

    router.push(pathname + '?' + newParams)
  }, [category.id, isActive, pathname, router, searchParams])

  return (
    <button
      onClick={() => setQuery()}
      className={clsx('hover:cursor-pointer', {
        ' underline': isActive,
      })}
    >
      {category.title}
    </button>
  )
}

export type TreeCategory = {
  id: number | string
  slug?: string | null
  title: string
  parent?: unknown
}

// Id родителя (или пустая строка, если верхний уровень)
const parentIdOf = (c: TreeCategory): string => {
  const p = c.parent
  if (p === null || p === undefined || p === '') return ''
  if (typeof p === 'object') return String((p as { id?: unknown }).id ?? '')
  return String(p)
}

// Дерево категорий для покупателя: верхний уровень виден сразу, подкатегории раскрываются
export const CategoryTree: React.FC<{ categories: TreeCategory[] }> = ({ categories }) => {
  const pathname = usePathname()
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  // Текущая категория по адресу вида /shop/слаг
  const activeSlug = pathname.match(/\/shop\/([^/?#]+)/)?.[1] ?? ''
  const activeId = useMemo(
    () => categories.find((c) => c.slug && c.slug === activeSlug)?.id,
    [categories, activeSlug],
  )

  // Карта: id родителя → его дети
  const childrenOf = useMemo(() => {
    const map = new Map<string, TreeCategory[]>()
    for (const c of categories) {
      const parent = parentIdOf(c)
      map.set(parent, [...(map.get(parent) ?? []), c])
    }
    return map
  }, [categories])

  // Карта: id категории → id её родителя
  const parentOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(String(c.id), parentIdOf(c))
    return map
  }, [categories])

  // Ветки, в которых лежит текущая категория
  const ancestors = useMemo(() => {
    const set = new Set<string>()
    if (activeId === undefined) return set
    let parent = parentOf.get(String(activeId)) ?? ''
    let guard = 0
    while (parent && guard < 10) {
      set.add(parent)
      parent = parentOf.get(parent) ?? ''
      guard++
    }
    return set
  }, [activeId, parentOf])

  // Открываем ветки с текущей категорией, чтобы покупатель видел, где он находится
  useEffect(() => {
    if (ancestors.size === 0) return
    setOpen((prev) => new Set([...prev, ...ancestors]))
  }, [ancestors])

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderLevel = (parentKey: string, depth: number): React.ReactNode =>
    (childrenOf.get(parentKey) ?? []).map((c) => {
      const id = String(c.id)
      const kids = childrenOf.get(id) ?? []
      const expanded = open.has(id)
      const isActive = activeId !== undefined && String(activeId) === id

      return (
        <li key={id}>
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 12 }}>
            {kids.length > 0 ? (
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={expanded ? 'Згорнути' : 'Розгорнути'}
                className="w-4 text-xs text-neutral-500 hover:cursor-pointer"
              >
                {expanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {c.slug ? (
              <Link
                href={`/shop/${c.slug}`}
                className={clsx('hover:underline', { underline: isActive })}
              >
                {c.title}
              </Link>
            ) : (
              <span>{c.title}</span>
            )}
          </div>
          {kids.length > 0 && expanded ? <ul>{renderLevel(id, depth + 1)}</ul> : null}
        </li>
      )
    })

  return <ul>{renderLevel('', 0)}</ul>
}