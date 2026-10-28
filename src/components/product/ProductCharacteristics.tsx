'use client'

import React, { useState } from 'react'

export type CharacteristicView = {
  id: string
  name: string
  values: { id: string; label: string; selected: boolean }[]
}

type Props = {
  title: string
  items: CharacteristicView[]
}

// Характеристики товара для покупателя: свёрнуты, видно выбранные значения
export const ProductCharacteristics: React.FC<Props> = ({ title, items }) => {
  const [open, setOpen] = useState<Set<string>>(new Set())

  if (items.length === 0) return null

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-medium">{title}</h2>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isOpen = open.has(item.id)
          const summary = item.values
            .filter((v) => v.selected)
            .map((v) => v.label)
            .join(', ')

          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="w-40 shrink-0 text-sm font-medium">{item.name}</span>
                <span className="flex-1 truncate text-sm">{summary || '—'}</span>
                <span className="text-xs opacity-70">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen ? (
                <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700">
                  {item.values.map((v) => (
                    <li
                      key={v.id}
                      className={v.selected ? 'font-medium' : 'opacity-50'}
                    >
                      {v.selected ? '✓ ' : ''}
                      {v.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}