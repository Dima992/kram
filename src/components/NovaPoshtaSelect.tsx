'use client'

import { Check, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

type City = { Ref: string; Present: string; DeliveryCity: string }
type Warehouse = { Ref: string; Description: string; Number: string }

export function NovaPoshtaSelect() {
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')

  // Поиск городов: от 2 букв, с паузой 300 мс после ввода
  useEffect(() => {
    if (selectedCity || cityQuery.trim().length < 2) {
      setCities([])
      return
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/novaposhta?action=cities&q=${encodeURIComponent(cityQuery)}`)
      const data = await res.json()
      setCities(data.items ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [cityQuery, selectedCity])

  // Загрузка отделений после выбора города
  useEffect(() => {
    if (!selectedCity) {
      setWarehouses([])
      return
    }
    let cancelled = false
    fetch(`/api/novaposhta?action=warehouses&ref=${encodeURIComponent(selectedCity.DeliveryCity)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setWarehouses(data.items ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [selectedCity])

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Доставка Новою Поштою</h3>
          <p className="text-xs text-muted-foreground">Оберіть ваше місто та зручне відділення</p>
        </div>
      </div>

      {/* Вибір міста */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Населений пункт</label>
        <input
          type="text"
          value={selectedCity ? selectedCity.Present : cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value)
            setSelectedCity(null)
          }}
          placeholder="Почніть вводити місто (наприклад, Вінниця)..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
        />

        {cityQuery && !selectedCity && cities.length > 0 && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {cities.map((city) => (
              <button
                key={city.DeliveryCity}
                type="button"
                onClick={() => {
                  setSelectedCity(city)
                  setCityQuery('')
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>{city.Present}</span>
                <Check className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Вибір відділення */}
      {selectedCity && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Відділення або поштомат</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          >
            <option value="">Оберіть відділення...</option>
            {warehouses.map((wh) => (
              <option key={wh.Ref} value={wh.Ref}>
                №{wh.Number}: {wh.Description}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}