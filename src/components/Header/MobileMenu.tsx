'use client'

import type { Header } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/providers/Auth'
import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Props {
  menu: Header['navItems']
}

export function MobileMenu({ menu }: Props) {
  const { user } = useAuth()

  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  const text = {
    uk: {
      myStore: 'Мій магазин',
      myAccount: 'Мій акаунт',
      orders: 'Замовлення',
      addresses: 'Адреси',
      manageAccount: 'Керувати акаунтом',
      logOut: 'Вийти',
      logIn: 'Увійти',
      createAccount: 'Створити акаунт',
      or: 'або',
    },
    ru: {
      myStore: 'Мой магазин',
      myAccount: 'Мой аккаунт',
      orders: 'Заказы',
      addresses: 'Адреса',
      manageAccount: 'Управлять аккаунтом',
      logOut: 'Выйти',
      logIn: 'Войти',
      createAccount: 'Создать аккаунт',
      or: 'или',
    },
  }[locale]

  const closeMobileMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname, searchParams])

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger aria-label="Меню" className="relative flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:bg-black dark:text-white">
        <MenuIcon className="h-4" />
      </SheetTrigger>

      <SheetContent side="left" className="px-4">
        <SheetHeader className="px-0 pt-4 pb-0">
          <SheetTitle>{text.myStore}</SheetTitle>

          <SheetDescription />
        </SheetHeader>

        <div className="py-4">
          {menu?.length ? (
            <ul className="flex w-full flex-col">
              {menu.map((item) => (
                <li className="py-2" key={item.id}>
                  <CMSLink {...item.link} appearance="link" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {user ? (
          <div className="mt-4">
            <h2 className="text-xl mb-4">{text.myAccount}</h2>
            <hr className="my-2" />
            <ul className="flex flex-col gap-2">
              <li>
                <Link href={`${localePrefix}/orders`}>{text.orders}</Link>
              </li>
              <li>
                <Link href={`${localePrefix}/account/addresses`}>{text.addresses}</Link>
              </li>
              <li>
                <Link href={`${localePrefix}/account`}>{text.manageAccount}</Link>
              </li>
              <li className="mt-6">
                <Button asChild variant="outline">
                  <Link href={`${localePrefix}/logout`}>{text.logOut}</Link>
                </Button>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <h2 className="text-xl mb-4">{text.myAccount}</h2>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild className="w-full sm:flex-1" variant="outline">
                <Link href={`${localePrefix}/login`}>{text.logIn}</Link>
              </Button>
              <span className="text-center text-sm text-muted-foreground sm:text-base">{text.or}</span>
              <Button asChild className="w-full sm:flex-1">
                <Link href={`${localePrefix}/create-account`}>{text.createAccount}</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
