'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

export default function Error({ reset }: { reset: () => void }) {
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  const text = {
    uk: {
      title: 'Ой ні!',
      description: 'Сталася проблема з нашим магазином. Це може бути тимчасова помилка, будь ласка, спробуйте ще раз.',
      action: 'Спробувати ще раз',
    },
    ru: {
      title: 'О нет!',
      description: 'Возникла проблема с нашим магазином. Это может быть временная ошибка, пожалуйста, попробуйте ещё раз.',
      action: 'Попробовать ещё раз',
    },
  }[locale]

  return (
    <div className="mx-auto my-4 flex max-w-xl flex-col rounded-lg border border-neutral-200 bg-white p-8 md:p-12 dark:border-neutral-800 dark:bg-black">
      <h2 className="text-xl font-bold">{text.title}</h2>
      <p className="my-2">{text.description}</p>
      <button
        className="mx-auto mt-4 flex w-full items-center justify-center rounded-full bg-blue-600 p-4 tracking-wide text-white hover:opacity-90"
        onClick={() => reset()}
        type="button"
      >
        {text.action}
      </button>
    </div>
  )
}
