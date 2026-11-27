'use client'

import type { Footer } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { usePathname } from 'next/navigation'

interface Props {
  menuUk: Footer['navItems']
  menuRu: Footer['navItems']
}

export function FooterMenu({ menuUk, menuRu }: Props) {
  const pathname = usePathname()
  const isRu = pathname === '/ru' || pathname.startsWith('/ru/')
  const menu = isRu && menuRu?.length ? menuRu : menuUk

  if (!menu?.length) return null

  return (
    <nav>
      <ul className="flex flex-col gap-3">
        {menu.map((item) => {
          return (
            <li key={item.id}>
              <CMSLink
                appearance="inline"
                className="group flex min-h-9 items-center gap-3 text-black transition dark:text-white"
                {...item.link}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition group-hover:bg-neutral-200 group-hover:text-black dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-neutral-700 dark:group-hover:text-white"
                >
                  →
                </span>
                <span className="group-hover:underline">{item.link?.label}</span>
              </CMSLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}