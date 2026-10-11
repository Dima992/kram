'use client'

import { Check, MapPin } from 'lucide-react'
import { useState } from 'react'

export function NovaPoshtaSelect() {
  const [cityQuery, setCityQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<{ ref: string; name: string } | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')

  // Демо-данные для визуальной проверки в интерфейсе
  const demoCities = [
    { ref: '1', name: 'м. Київ, Київська обл.' },
    { ref: '2', name: 'м. Вінниця, Вінницька обл.' },
    { ref: '3', name: 'м. Львів, Львівська обл.' },
    { ref: '4', name: 'м. Одеса, Одеська обл.' },
  ]

  const demoWarehouses = [
    'Відділення №1: вул. Пирогова, 46',
    'Відділення №2: вул. Хмельницьке шосе, 82',
    'Поштомат №8492: вул. Соборна, 24',
  ]

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Доставка Новою Поштою</h3>
          <p className="text-xs text-muted-foreground">Оберіть ваше місто та зручне відділення</p>
        </div>
      </div>

      {/* Выбор города */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Населений пункт</label>
        <input
          type="text"
          value={selectedCity ? selectedCity.name : cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value)
            setSelectedCity(null)
          }}
          placeholder="Почніть вводити місто (наприклад, Вінниця)..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
        />

        {/* Выпадающий список городов */}
        {cityQuery && !selectedCity && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {demoCities.map((city) => (
              <button
                key={city.ref}
                type="button"
                onClick={() => {
                  setSelectedCity({ ref: city.ref, name: city.name })
                  setCityQuery('')
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <span>{city.name}</span>
                <Check className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Выбор отделения */}
      {selectedCity && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Відділення або поштомат</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          >
            <option value="">Оберіть відділення...</option>
            {demoWarehouses.map((wh, idx) => (
              <option key={idx} value={wh}>
                {wh}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}