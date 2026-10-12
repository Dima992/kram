'use client'

import { Button } from '@/components/ui/button'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  className?: string
}

export const AccountNav: React.FC<Props> = ({ className }) => {
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const text = {
    uk: {
      accountSettings: 'Налаштування акаунта',
      addresses: 'Адреси',
      orders: 'Замовлення',
      logout: 'Вийти',
    },
    ru: {
      accountSettings: 'Настройки аккаунта',
      addresses: 'Адреса',
      orders: 'Заказы',
      logout: 'Выйти',
    },
  }[locale]

  return (
    <div className={clsx(className)}>
      <ul className="flex flex-col gap-2">
        <li>
          <Button asChild variant="link">
            <Link
              href={`${localePrefix}/account`}
              className={clsx('text-primary/50 hover:text-primary hover:no-underline', {
                'text-primary': pathname === `${localePrefix}/account`,
              })}
            >
              {text.accountSettings}
            </Link>
          </Button>
        </li>

        <li>
          <Button asChild variant="link">
            <Link
              href={`${localePrefix}/account/addresses`}
              className={clsx('text-primary/50 hover:text-primary hover:no-underline', {
                'text-primary': pathname === `${localePrefix}/account/addresses`,
              })}
            >
              {text.addresses}
            </Link>
          </Button>
        </li>

        <li>
          <Button
            asChild
            variant="link"
            className={clsx('text-primary/50 hover:text-primary hover:no-underline', {
              'text-primary': pathname === `${localePrefix}/orders` || pathname.includes('/orders'),
            })}
          >
            <Link href={`${localePrefix}/orders`}>{text.orders}</Link>
          </Button>
        </li>
      </ul>

      <hr className="w-full border-white/5" />

      <Button
        asChild
        variant="link"
        className={clsx('text-primary/50 hover:text-primary hover:no-underline', {
          'text-primary': pathname === `${localePrefix}/logout`,
        })}
      >
        <Link href={`${localePrefix}/logout`}>{text.logout}</Link>
      </Button>
    </div>
  )
}
