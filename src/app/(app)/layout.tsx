import { Analytics } from '@/components/Analytics'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { getCachedGlobal } from '@/utilities/getGlobals'
import type { ReactNode } from 'react'
import './globals.css'

type Args = {
  children: ReactNode
}

const Layout = async ({ children }: Args) => {
  const siteSettings = await getCachedGlobal('site-settings', 1)()

  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <InitTheme />
      </head>
      <body>
        <Providers stripePublishableKey={siteSettings.stripePublishableKey || ''}>
          <Analytics googleTagManagerId={siteSettings.googleTagManagerId} />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export default Layout