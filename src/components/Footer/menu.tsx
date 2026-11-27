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
      <ul className="flex flex-col gap-2">
        {menu.map((item) => {
          return (
            <li key={item.id}>
              <CMSLink
                appearance="inline"
                className="text-black transition hover:underline dark:text-white"
                {...item.link}
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}