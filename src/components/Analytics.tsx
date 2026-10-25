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
    message:
      'Ми використовуємо cookie для статистики та реклами. Ви можете прийняти все або лише необхідні.',
    all: 'Прийняти все',
    necessary: 'Тільки необхідні',
    details: 'Детальніше',
    privacyHref: '/privacy',
  },
  ru: {
    message: 'Мы используем cookie для статистики и рекламы. Вы можете принять всё или только необходимые.',
    all: 'Принять все',
    necessary: 'Только необходимые',
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

  const choose = (value: Consent) => {
    localStorage.setItem(STORAGE_KEY, value)
    setConsent(value)
  }

  const gtmID = googleTagManagerId
    ? JSON.stringify(googleTagManagerId).replace(/</g, '\\u003c')
    : ''

  // Счётчики грузятся только после нажатия «Принять все»
  const allowTracking = consent === 'all' && Boolean(googleTagManagerId)

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

      {ready && consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background p-4 shadow-lg">
          <div className="container flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-foreground">
              {text[locale].message}{' '}
              <Link href={text[locale].privacyHref} className="underline">
                {text[locale].details}
              </Link>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => choose('necessary')}
                className="rounded border border-border px-4 py-2 text-sm text-foreground"
              >
                {text[locale].necessary}
              </button>
              <button
                type="button"
                onClick={() => choose('all')}
                className="rounded bg-[#0b7a78] px-4 py-2 text-sm text-white"
              >
                {text[locale].all}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}