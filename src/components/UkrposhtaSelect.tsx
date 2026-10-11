'use client'

import { Package } from 'lucide-react'
import { useState } from 'react'

export function UkrposhtaSelect() {
  const [index, setIndex] = useState('')
  const [address, setAddress] = useState('')

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Доставка Укрпоштою</h3>
          <p className="text-xs text-muted-foreground">Вкажіть поштовий індекс та адресу відділення</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Поштовий індекс (5 цифр)
          </label>
          <input
            type="text"
            maxLength={5}
            value={index}
            onChange={(e) => setIndex(e.target.value)}
            placeholder="21000"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Область, місто/село та адреса
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Вінницька обл., м. Вінниця, вул. Соборна, 1"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          />
        </div>
      </div>
    </div>
  )
}