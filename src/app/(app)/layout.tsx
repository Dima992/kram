import configPromise from '@payload-config'
import '@payloadcms/next/css'
import './globals.css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ReactNode } from 'react'
import { Analytics } from '@/components/Analytics'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Providers } from '@/providers'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { importMap } from '../(payload)/admin/importMap.js'

type Args = {
  children: ReactNode
}

const ServerFunctionHandler = async (args: any) => {
  'use server'
  return handleServerFunctions({
    ...args,
    config: configPromise,
    importMap,
  })
}

const Layout = async ({ children }: Args) => {
  const siteSettings = await getCachedGlobal('site-settings', 1)()

  return (
    <RootLayout config={configPromise} importMap={importMap} serverFunction={ServerFunctionHandler}>
      <Providers stripePublishableKey={siteSettings.stripePublishableKey || ''}>
        <Analytics
          googleTagManagerId={siteSettings.googleTagManagerId}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </Providers>
    </RootLayout>
  )
}

export default Layout
