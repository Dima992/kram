'use client'

import { usePathname } from 'next/navigation'

const titles = {
  info: { uk: 'Інформація', ru: 'Информация' },
  contacts: { uk: 'Контакти', ru: 'Контакты' },
} as const

export function FooterHeading({ kind }: { kind: keyof typeof titles }) {
  const pathname = usePathname()
  const locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uk'

  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black dark:text-white">
      {titles[kind][locale]}
    </h2>
  )
}