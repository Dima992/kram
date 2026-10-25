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
      <ul>
        {menu.map((item) => {
          return (
            <li key={item.id} className="py-1">
              <CMSLink
                appearance="link"
                className="flex min-h-11 items-center"
                {...item.link}
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}