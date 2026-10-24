import type { Footer as FooterGlobal, SiteSetting } from '@/payload-types'

import { FooterHeading } from '@/components/Footer/FooterHeading'
import { FooterMenu } from '@/components/Footer/menu'
import { LogoIcon } from '@/components/icons/logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React, { Suspense } from 'react'

type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'telegram'
  | 'viber'
  | 'whatsapp'
  | 'youtube'
  | 'linkedin'
  | 'pinterest'
  | 'tiktok'
  | 'other'

type SocialItem = {
  id?: string | null
  platform: SocialPlatform
  customName?: string | null
  url: string
  enabled?: boolean | null
}

type PaymentItem = {
  id?: string | null
  name: string
  logo?: number | { url?: string | null; alt?: string | null } | null
  enabled?: boolean | null
}

type ContactsData = {
  phones?: { id?: string | null; label?: string | null; number: string; enabled?: boolean | null }[] | null
  emails?: { id?: string | null; email: string; enabled?: boolean | null }[] | null
  address?: string | null
  other?: { id?: string | null; label: string; value: string; enabled?: boolean | null }[] | null
}

type FooterExtra = {
  socials?: SocialItem[] | null
  paymentMethods?: PaymentItem[] | null
  contacts?: ContactsData | null
}

const socialLabels: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  telegram: 'Telegram',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  other: 'Ссылка',
}

const socialIcons: Record<SocialPlatform, React.ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.5H7.6V14h2.8v8h3.1z" />
    </svg>
  ),
  instagram: (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M21.6 4.3 18.4 19.5c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6.1 13.1 1.2 11.6c-1-.3-1-1 .2-1.5L20.3 2.8c.8-.3 1.6.2 1.3 1.5z" />
    </svg>
  ),
  viber: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 4.9 3.6 6.4L5 21l4.4-2.4c.8.2 1.7.3 2.6.3 5.5 0 10-3.8 10-8.5S17.5 2 12 2z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.2 3.6 2.5 1 2.5.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M23 7.2c-.3-1-1-1.8-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5c-1 .2-1.7 1-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8c.3 1 1 1.8 2 2 1.8.5 9 .5 9 .5s7.2 0 9-.5c1-.2 1.7-1 2-2 .5-1.8.5-4.8.5-4.8s0-3-.5-4.8zM9.7 15.2V8.8l6 3.2-6 3.2z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.5 2.2-.8 3.4-.2 1 .5 1.9 1.5 1.9 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 5.9 0 3.5-2.2 6.4-5.3 6.4-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.9 2-1.3 2.6A10 10 0 1 0 12 2z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M16.6 2h-3.2v13.3a2.7 2.7 0 1 1-2.7-2.7c.2 0 .5 0 .7.1V9.3a6 6 0 1 0 5.2 6V8.6a7.6 7.6 0 0 0 4.4 1.4V6.8S18.8 7 16.6 2z" />
    </svg>
  ),
  other: (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.5 1.5M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.5-1.5" />
    </svg>
  ),
}

export async function Footer() {
  const footer: FooterGlobal = await getCachedGlobal('footer', 1, 'uk')()
  const footerRu: FooterGlobal = await getCachedGlobal('footer', 1, 'ru')()
  const siteSettings: SiteSetting = await getCachedGlobal('site-settings', 1)()
  const extra = footer as FooterGlobal & FooterExtra
  const menu = footer.navItems || []
  const menuRu = footerRu.navItems || []

  const socials = ((extra.socials || []) as SocialItem[]).filter(
    (item) => item.enabled !== false && item.url,
  )

  const payments = ((extra.paymentMethods || []) as PaymentItem[]).flatMap((item) => {
    const logo = item.logo
    if (!item.enabled || !logo || typeof logo !== 'object' || !logo.url) return []
    return [
      {
        key: item.id || item.name,
        name: item.name,
        url: logo.url,
        alt: logo.alt || item.name,
      },
    ]
  })

  const contacts = (extra.contacts || {}) as ContactsData
  const phones = (contacts.phones || []).filter((p) => p.enabled !== false && p.number)
  const emails = (contacts.emails || []).filter((e) => e.enabled !== false && e.email)
  const others = (contacts.other || []).filter((o) => o.enabled !== false && o.label && o.value)
  const hasContacts =
    phones.length > 0 || emails.length > 0 || !!contacts.address || others.length > 0

  const currentYear = new Date().getFullYear()
  const copyrightDate = 2023 + (currentYear > 2023 ? `-${currentYear}` : '')
  const skeleton = 'w-full h-6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700'

  const copyrightName = siteSettings.companyName || siteSettings.siteName || ''

  return (
    <footer className="text-sm text-neutral-500 dark:text-neutral-400">
      <div className="container">
        <div className="flex w-full flex-col gap-8 border-t border-neutral-200 py-12 text-sm md:flex-row md:gap-12 dark:border-neutral-700">
          <div className="flex flex-col gap-4">
            <Link className="flex items-center gap-2 text-black md:pt-1 dark:text-white" href="/">
              <LogoIcon className="w-6" />
              <span className="sr-only">{siteSettings.siteName || ''}</span>
            </Link>
                        {socials.length > 0 && (
              <ul className="flex flex-col gap-3">
    {socials.map((item) => {
                  const label =
                    item.platform === 'other' && item.customName
                      ? item.customName
                      : socialLabels[item.platform]
                  return (
                    <li key={item.id || `${item.platform}-${item.url}`}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 text-black transition hover:underline dark:text-white"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 transition group-hover:bg-neutral-200 dark:bg-neutral-800 dark:group-hover:bg-neutral-700">
                          {socialIcons[item.platform] ?? socialIcons.other}
                        </span>
                        <span>{label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {menu.length > 0 && (
            <div className="flex flex-col gap-3">
              <FooterHeading kind="info" />
              <Suspense
                fallback={
                  <div className="flex h-[188px] w-[200px] flex-col gap-2">
                    <div className={skeleton} />
                    <div className={skeleton} />
                    <div className={skeleton} />
                    <div className={skeleton} />
                    <div className={skeleton} />
                    <div className={skeleton} />
                  </div>
                }
              >
              <FooterMenu menuUk={menu} menuRu={menuRu} />
              </Suspense>
            </div>
          )}

          {hasContacts && (
            <div className="flex flex-col gap-3">
              <FooterHeading kind="contacts" />
              {phones.map((p) => (
                <a
                  key={p.id || p.number}
                  href={`tel:${p.number.replace(/[^\d+]/g, '')}`}
                  className="text-black transition hover:underline dark:text-white"
                >
                  {p.label ? `${p.label}: ` : ''}
                  {p.number}
                </a>
              ))}
              {emails.map((e) => (
                <a
                  key={e.id || e.email}
                  href={`mailto:${e.email}`}
                  className="break-all text-black transition hover:underline dark:text-white"
                >
                  {e.email}
                </a>
              ))}
              {contacts.address && <p>{contacts.address}</p>}
              {others.map((o) => (
                <p key={o.id || o.label}>
                  <span className="text-black dark:text-white">{o.label}:</span> {o.value}
                </p>
              ))}
            </div>
          )}

          <div className="md:ml-auto flex flex-col gap-4 items-end">
            <LanguageSwitcher />
            <ThemeSelector />
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="border-t border-neutral-200 py-6 dark:border-neutral-700">
          <ul className="container flex flex-wrap items-center justify-center gap-3">
            {payments.map((item) => (
              <li
                key={item.key}
                className="flex h-10 items-center justify-center rounded bg-white px-2"
              >
                <img
                  src={item.url}
                  alt={item.alt}
                  width={96}
                  height={32}
                  loading="lazy"
                  className="h-8 w-auto"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-neutral-200 py-6 text-sm dark:border-neutral-700">
        <div className="container mx-auto flex w-full flex-col items-center gap-1 md:flex-row md:gap-0">
          <p>
            &copy; {copyrightDate} {copyrightName}
          </p>
        </div>
      </div>
    </footer>
  )
}