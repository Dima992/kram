'use client'

import { Check, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

type Lang = 'ua' | 'ru'
type UkrCity = { id: string; name: string; regionId: string; label: string }
type UkrOffice = { id: string; postcode: string; name: string; address: string }
export type UPDelivery = { city: string; warehouse: string; postcode: string }

const dictionary = {
  ua: {
    title: 'Доставка Укрпоштою',
    subtitle: 'Оберіть населений пункт і відділення Укрпошти',
    cityLabel: 'Населений пункт',
    cityPlaceholder: 'Почніть вводити назву (наприклад, Вінниця)...',
    officeLabel: 'Відділення',
    officePlaceholder: 'Оберіть відділення...',
    noOffices:
      'У цьому населеному пункті відділення не знайдено. Напишіть у коментарі адресу відділення.',
    loadError:
      'Зараз не вдається завантажити відділення. Напишіть у коментарі місто та номер відділення, ми підберемо його разом з вами.',
  },
  ru: {
    title: 'Доставка Укрпочтой',
    subtitle: 'Выберите населенный пункт и отделение Укрпочты',
    cityLabel: 'Населенный пункт',
    cityPlaceholder: 'Начните вводить название (например, Винница)...',
    officeLabel: 'Отделение',
    officePlaceholder: 'Выберите отделение...',
    noOffices:
      'В этом населенном пункте отделения не найдены. Напишите в комментарии адрес отделения.',
    loadError:
      'Сейчас не удается загрузить отделения. Напишите в комментарии город и номер отделения, мы подберем его вместе с вами.',
  },
}

type Props = {
  lang?: Lang
  onChange: (value: UPDelivery | null) => void
  onError?: (hasError: boolean) => void
}

export function UkrposhtaSelect({ lang = 'ua', onChange, onError }: Props) {
  const t = dictionary[lang]

  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<UkrCity[]>([])
  const [selectedCity, setSelectedCity] = useState<UkrCity | null>(null)
  const [offices, setOffices] = useState<UkrOffice[]>([])
  const [selectedOffice, setSelectedOffice] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [noOffices, setNoOffices] = useState(false)

  const reportError = (value: boolean) => {
    setLoadError(value)
    onError?.(value)
  }

  // Поиск населённых пунктов: от 2 букв, с паузой 300 мс после ввода
  useEffect(() => {
    if (selectedCity || cityQuery.trim().length < 2) {
      setCities([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ukrposhta?action=cities&q=${encodeURIComponent(cityQuery)}`)
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

  // Загрузка отделений после выбора населённого пункта
  useEffect(() => {
    if (!selectedCity) {
      setOffices([])
      setNoOffices(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `/api/ukrposhta?action=offices&cityId=${encodeURIComponent(selectedCity.id)}&regionId=${encodeURIComponent(selectedCity.regionId)}`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        const items: UkrOffice[] = data.items ?? []
        setOffices(items)
        setNoOffices(items.length === 0)
        reportError(false)
      } catch {
        if (cancelled) return
        setOffices([])
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
        <div className="rounded-lg bg-zinc-900/10 p-2 text-zinc-800 dark:bg-white/10 dark:text-zinc-100">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.title}</h3>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      {/* Вибір населеного пункту */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.cityLabel}</label>
        <input
          type="text"
          value={selectedCity ? selectedCity.label : cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value)
            setSelectedCity(null)
            setSelectedOffice('')
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
                key={city.id}
                type="button"
                onClick={() => {
                  setSelectedCity(city)
                  setCityQuery('')
                  setSelectedOffice('')
                  reportError(false)
                  onChange(null)
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>{city.label}</span>
                <Check className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Вибір відділення */}
      {selectedCity && !noOffices && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.officeLabel}</label>
          <select
            value={selectedOffice}
            onChange={(e) => {
              const id = e.target.value
              setSelectedOffice(id)
              const office = offices.find((o) => o.id === id)
              if (selectedCity && office) {
                // Индекс сохраняем отдельно, в отделении только адрес
                onChange({
                  city: selectedCity.label,
                  warehouse: office.address,
                  postcode: office.postcode,
                })
              } else {
                onChange(null)
              }
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:focus:border-white"
          >
            <option value="">{t.officePlaceholder}</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.postcode}, {office.address}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCity && noOffices && !loadError && (
        <p className="text-xs text-muted-foreground">{t.noOffices}</p>
      )}

      {loadError && <p className="text-xs font-medium text-red-600">{t.loadError}</p>}
    </div>
  )
}