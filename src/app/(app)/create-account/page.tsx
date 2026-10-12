import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'
import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CreateAccountForm } from '@/components/forms/CreateAccountForm'
import { redirect } from 'next/navigation'

export default async function CreateAccount() {
  const headers = await getHeaders()
  const locale = headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const text = {
    uk: {
      alreadyLoggedIn: 'Ви вже увійшли в систему.',
      heading: 'Створення акаунта',
    },
    ru: {
      alreadyLoggedIn: 'Вы уже вошли в систему.',
      heading: 'Создание аккаунта',
    },
  }[locale]

  if (user) {
    redirect(`/account?warning=${encodeURIComponent(text.alreadyLoggedIn)}`)
  }

  return (
    <div className="container py-16">
      <h1 className="text-xl mb-4">{text.heading}</h1>
      <RenderParams />
      <CreateAccountForm />
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Створіть обліковий запис або увійдіть у вже існуючий.',
  openGraph: mergeOpenGraph({
    title: 'Акаунт',
    url: '/account',
  }),
  title: 'Акаунт',
}
