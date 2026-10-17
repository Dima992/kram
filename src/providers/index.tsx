import { AuthProvider } from '@/providers/Auth'
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { stripeAdapterClient } from '@payloadcms/plugin-ecommerce/payments/stripe'
import React from 'react'

import { SonnerProvider } from '@/providers/Sonner'
import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
  stripePublishableKey?: string
}> = ({ children, stripePublishableKey = '' }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HeaderThemeProvider>
          <SonnerProvider />
          <EcommerceProvider
            enableVariants={true}
            currenciesConfig={{
              defaultCurrency: 'UAH',
              supportedCurrencies: [{ code: 'UAH', decimals: 0, label: 'Гривня', symbol: '₴' }],
            }}
            api={{
              cartsFetchQuery: {
                depth: 2,
                populate: {
                  products: {
                    slug: true,
                    title: true,
                    gallery: true,
                    inventory: true,
                    enableVariants: true,
                    priceInUAH: true,
                  },
                  variants: {
                    title: true,
                    inventory: true,
                    priceInUAH: true,
                    options: true,
                  },
                },
              },
            }}
            paymentMethods={[
              stripeAdapterClient({
                publishableKey: stripePublishableKey,
              }),
            ]}
          >
            {children}
          </EcommerceProvider>
        </HeaderThemeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
