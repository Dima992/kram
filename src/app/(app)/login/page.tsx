import type { Metadata } from 'next'

import { RenderParams } from '@/components/RenderParams'
import Link from 'next/link'
import React from 'react'

import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { LoginForm } from '@/components/forms/LoginForm'
import { redirect } from 'next/navigation'

export default async function Login() {
  const headers = await getHeaders()
  const locale = headers.get('x-locale') === 'ru' ? 'ru' : 'uk'
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  const text = {
    uk: {
      alreadyLoggedIn: 'Ви вже увійшли в систему.',
      heading: 'Вхід',
      description:
        'Тут ваші клієнти входять у свій обліковий запис, переглядають історію замовлень і багато іншого. Щоб керувати всіма користувачами, ',
      adminLink: 'увійдіть в адмін-панель',
    },
    ru: {
      alreadyLoggedIn: 'Вы уже вошли в систему.',
      heading: 'Вход',
      description:
        'Здесь ваши клиенты входят в личный кабинет, просматривают историю заказов и многое другое. Чтобы управлять всеми пользователями, ',
      adminLink: 'войдите в админ-панель',
    },
  }[locale]

  if (user) {
    redirect(`/account?warning=${encodeURIComponent(text.alreadyLoggedIn)}`)
  }

  return (
    <div className="container">
      <div className="max-w-xl mx-auto my-12">
        <RenderParams />

        <h1 className="mb-4 text-[1.8rem]">{text.heading}</h1>
        <p className="mb-8">
          {text.description}
          <Link href="/admin/collections/users">{text.adminLink}</Link>.
        </p>
        <LoginForm />
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Увійдіть або створіть обліковий запис, щоб почати.',
  openGraph: {
    title: 'Вхід',
    url: '/login',
  },
  title: 'Вхід',
}
