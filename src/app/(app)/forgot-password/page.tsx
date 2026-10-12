import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

export default async function ForgotPasswordPage() {
  return (
    <div className="container py-16">
      <ForgotPasswordForm />
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Введіть адресу електронної пошти, щоб відновити пароль.',
  openGraph: mergeOpenGraph({
    title: 'Відновлення пароля',
    url: '/forgot-password',
  }),
  title: 'Відновлення пароля',
}
