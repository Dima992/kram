import Link from 'next/link'
import React from 'react'
import { headers } from 'next/headers'

import { Button } from '@/components/ui/button'

export default async function NotFound() {
  const requestHeaders = await headers()
  const locale = requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''

  const text = {
    uk: {
      description: 'Цю сторінку не знайдено.',
      home: 'На головну',
    },
    ru: {
      description: 'Эта страница не найдена.',
      home: 'На главную',
    },
  }[locale]

  return (
    <div className="container py-28">
      <div className="prose max-w-none">
        <h1 style={{ marginBottom: 0 }}>404</h1>
        <p className="mb-4">{text.description}</p>
      </div>
      <Button asChild variant="default">
        <Link href={localePrefix || '/'}>{text.home}</Link>
      </Button>
    </div>
  )
}
