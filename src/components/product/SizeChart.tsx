'use client'

import { RichText } from '@/components/RichText'
import { ChevronDown } from 'lucide-react'
import { useState, type MouseEvent } from 'react'

type Props = {
  title?: string | null
  table: unknown
  locale: 'uk' | 'ru'
}

const labels = {
  uk: 'Таблиця розмірів',
  ru: 'Таблица размеров',
}

export function SizeChart({ title, table, locale }: Props) {
  const [open, setOpen] = useState(false)

  if (!table) return null

  // Подсветка строки: нажали на строку — она выделилась, другая строка снимает выделение
  const onRowClick = (e: MouseEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest('tbody tr') as HTMLElement | null
    if (!row) return
    const wasSelected = row.dataset.selected === 'true'
    e.currentTarget.querySelectorAll('tbody tr').forEach((el) => {
      ;(el as HTMLElement).dataset.selected = 'false'
    })
    row.dataset.selected = wasSelected ? 'false' : 'true'
  }

  return (
    <div className="order-4 lg:order-none">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left font-medium"
      >
        <span>{title || labels[locale]}</span>
        <ChevronDown className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          onClick={onRowClick}
          className="mt-3 max-h-40 overflow-y-auto rounded-md border [&_table]:w-full [&_table]:border-collapse [&_th]:p-2 [&_td]:p-2 [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:bg-white [&_tbody_tr]:cursor-pointer [&_tbody_tr:nth-child(even)]:bg-neutral-50 [&_tbody_tr[data-selected=true]]:bg-[#0b7a78]/15 [&_tbody_td:first-child]:font-semibold"
        >
          <RichText data={table as any} enableGutter={false} />
        </div>
      )}
    </div>
  )
}