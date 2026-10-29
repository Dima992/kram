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

// Блок «Характеристики»: раскрывается целиком, внутри таблица со всеми характеристиками
export const ProductCharacteristics: React.FC<Props> = ({ title, items }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <section className="mb-10">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left text-xl font-medium dark:border-neutral-700"
      >
        <span>{title}</span>
        <span className="text-base opacity-70">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen ? (
        <table className="mt-2 w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 text-sm dark:border-neutral-700">
          <tbody>
            {items.map((item) => {
              const selected = item.values
                .filter((v) => v.selected)
                .map((v) => v.label)
                .join(', ')

              return (
                <tr
                  key={item.id}
                  className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-700"
                >
                  <th scope="row" className="w-1/3 px-4 py-3 text-left align-top font-medium">
                    {item.name}
                  </th>
                  <td className="px-4 py-3">{selected || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}
    </section>
  )
}