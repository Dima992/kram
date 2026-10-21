'use client'

import { Check, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

type City = { Ref: string; Present: string; DeliveryCity: string }
type Warehouse = { Ref: string; Description: string; Number: string }
export type NPDelivery = { city: string; warehouse: string }
type Lang = 'ua' | 'ru'

const dictionary = {
  ua: {
    title: 'Доставка Новою Поштою',
    subtitle: 'Оберіть ваше місто та зручне відділення',
    cityLabel: 'Населений пункт',
    cityPlaceholder: 'Почніть вводити місто (наприклад, Вінниця)...',
    warehouseLabel: 'Відділення або поштомат',
    warehousePlaceholder: 'Оберіть відділення...',
    loadError:
      'Зараз не вдається завантажити відділення. Напишіть у коментарі місто та номер відділення, ми підберемо його разом з вами.',
  },
  ru: {
    title: 'Доставка Новой Почтой',
    subtitle: 'Выберите ваш город и удобное отделение',
    cityLabel: 'Населенный пункт',
    cityPlaceholder: 'Начните вводить город (например, Винница)...',
    warehouseLabel: 'Отделение или почтомат',
    warehousePlaceholder: 'Выберите отделение...',
    loadError:
      'Сейчас не удается загрузить отделения. Напишите в комментарии город и номер отделения, мы подберем его вместе с вами.',
  },
}

type Props = {
  lang?: Lang
  onChange: (value: NPDelivery | null) => void
  onError?: (hasError: boolean) => void
}

export function NovaPoshtaSelect({ lang = 'ua', onChange, onError }: Props) {
  const t = dictionary[lang]

  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [loadError, setLoadError] = useState(false)

  const reportError = (value: boolean) => {
    setLoadError(value)
    onError?.(value)
  }

  // Поиск городов: от 2 букв, с паузой 300 мс после ввода
  useEffect(() => {
    if (selectedCity || cityQuery.trim().length < 2) {
      setCities([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/novaposhta?action=cities&q=${encodeURIComponent(cityQuery)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setCities(data.items ?? [])
        reportError(false)
      } catch {
        if (cancelled) return
        setCities([])
        reportError(true)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // reportError меняется при каждом рендере, поэтому его не включаем в зависимости
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQuery, selectedCity])

  // Загрузка отделений после выбора города
  useEffect(() => {
    if (!selectedCity) {
      setWarehouses([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `/api/novaposhta?action=warehouses&ref=${encodeURIComponent(selectedCity.DeliveryCity)}`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setWarehouses(data.items ?? [])
        reportError(false)
      } catch {
        if (cancelled) return
        setWarehouses([])
        reportError(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // reportError меняется при каждом рендере, поэтому его не включаем в зависимости
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity])

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.title}</h3>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      {/* Вибір міста */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.cityLabel}</label>
        <input
          type="text"
          value={selectedCity ? selectedCity.Present : cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value)
            setSelectedCity(null)
            setSelectedWarehouse('')
            reportError(false)
            onChange(null)
          }}
          placeholder={t.cityPlaceholder}
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
                  setSelectedWarehouse('')
                  reportError(false)
                  onChange(null)
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
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.warehouseLabel}</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => {
              const ref = e.target.value
              setSelectedWarehouse(ref)
              const wh = warehouses.find((w) => w.Ref === ref)
              if (selectedCity && wh) {
                onChange({
                  city: selectedCity.Present,
                  warehouse: `№${wh.Number}: ${wh.Description}`,
                })
              } else {
                onChange(null)
              }
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          >
            <option value="">{t.warehousePlaceholder}</option>
            {warehouses.map((wh) => (
              <option key={wh.Ref} value={wh.Ref}>
                №{wh.Number}: {wh.Description}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadError && <p className="text-xs font-medium text-red-600">{t.loadError}</p>}
    </div>
  )
}