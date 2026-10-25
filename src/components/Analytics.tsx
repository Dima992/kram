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
    title: 'Cookie та конфіденційність',
    message:
      'Ми використовуємо cookie для статистики та реклами. Ви можете прийняти все або лише необхідні.',
    all: 'Прийняти все',
    necessary: 'Тільки необхідні',
    details: 'Детальніше',
    privacyHref: '/privacy',
  },
  ru: {
    title: 'Cookie и конфиденциальность',
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

      {ready && consent === null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-title"
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <h2 id="cookie-title" className="mb-3 text-lg font-medium text-foreground">
              {t.title}
            </h2>

            <p className="mb-4 text-sm text-foreground">
              {t.message}{' '}
              <Link href={t.privacyHref} className="underline">
                {t.details}
              </Link>
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => choose('necessary')}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground"
              >
                {t.necessary}
              </button>
              <button
                type="button"
                onClick={() => choose('all')}
                className="flex-1 rounded-lg bg-[#0b7a78] px-4 py-2 text-sm text-white"
              >
                {t.all}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}