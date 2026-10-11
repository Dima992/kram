'use client'

import { usePathname } from 'next/navigation'

export const LanguageSwitcher = () => {
  const pathname = usePathname()

  const currentLocale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uk'

  const switchLanguage = (newLocale: string) => {
    if (currentLocale === newLocale) return

    const localePattern = /^\/(uk|ru)(?=\/|$)/
    const pathWithoutLocale = pathname.replace(localePattern, '') || '/'
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`

    window.location.assign(`${newPath}${window.location.search}${window.location.hash}`)
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <button
        type="button"
        onClick={() => switchLanguage('uk')}
        aria-pressed={currentLocale === 'uk'}
        className={`rounded px-2 py-1 transition-colors ${
          currentLocale === 'uk'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-black dark:hover:text-white'
        }`}
      >
        УКР
      </button>
      <span className="text-gray-300">|</span>
      <button
        type="button"
        onClick={() => switchLanguage('ru')}
        aria-pressed={currentLocale === 'ru'}
        className={`rounded px-2 py-1 transition-colors ${
          currentLocale === 'ru'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-black dark:hover:text-white'
        }`}
      >
        РУ
      </button>
    </div>
  )
}
