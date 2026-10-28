'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect, useState } from 'react'

type AnalyticsProps = {
  googleTagManagerId?: string | null
}

type Consent = 'all' | 'necessary'

const STORAGE_KEY = 'cookie-consent'

const text = {
  uk: {
    message: 'Ми використовуємо cookie, щоб сайт працював краще.',
    all: 'Прийняти все',
    decline: 'Відмовитися',
    details: 'Детальніше',
    privacyHref: '/privacy',
  },
  ru: {
    message: 'Мы используем cookie, чтобы сайт работал лучше.',
    all: 'Принять все',
    decline: 'Отказаться',
    details: 'Подробнее',
    privacyHref: '/ru/privacy',
  },
}

export function Analytics({ googleTagManagerId }: AnalyticsProps) {
  const pathname = usePathname()
  const locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uk'

  const [consent, setConsent] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)

  // Читаем сохранённый выбор посетителя после загрузки страницы
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'all' || saved === 'necessary') setConsent(saved)
    setReady(true)
  }, [])

  // Выбор запоминаем, облачко больше не появляется
  const choose = (value: Consent) => {
    localStorage.setItem(STORAGE_KEY, value)
    setConsent(value)
  }

  const gtmID = googleTagManagerId
    ? JSON.stringify(googleTagManagerId).replace(/</g, '\\u003c')
    : ''

  // Счётчики грузятся только после нажатия «Принять все»
  const allowTracking = consent === 'all' && Boolean(googleTagManagerId)

  const t = text[locale]

  return (
    <>
      {allowTracking && (
        <Script
          id="gtm-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer',${gtmID});
            `,
          }}
        />
      )}

      {/* Облачко в правом нижнем углу: без затемнения, сайт доступен, прокрутка работает */}
      {ready && consent === null && (
        <div
          role="region"
          aria-label="Cookie"
          className="fixed right-4 bottom-4 z-[60] w-[300px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/60 bg-white/90 p-5 text-sm text-neutral-800 shadow-2xl backdrop-blur-md sm:right-6 sm:bottom-6 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-100"
        >
          <p className="mb-4 leading-relaxed">
            {t.message}{' '}
            <Link href={t.privacyHref} className="underline underline-offset-2">
              {t.details}
            </Link>
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => choose('all')}
              className="flex-1 rounded-full bg-[#0b7a78] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              {t.all}
            </button>
            <button
              type="button"
              onClick={() => choose('necessary')}
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-xs transition hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              {t.decline}
            </button>
          </div>
        </div>
      )}
    </>
  )
}