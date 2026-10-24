'use client'

import { usePathname } from 'next/navigation'

const titles = {
  info: { uk: 'Інформація', ru: 'Информация' },
  contacts: { uk: 'Контакти', ru: 'Контакты' },
} as const

export function FooterHeading({ kind }: { kind: keyof typeof titles }) {
  const pathname = usePathname()
  const locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uk'

  return <h3 className="font-semibold text-black dark:text-white">{titles[kind][locale]}</h3>
}