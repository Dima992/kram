'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
}

export const ForgotPasswordForm: React.FC = () => {
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const text = {
    uk: {
      title: 'Відновлення пароля',
      description:
        'Будь ласка, введіть вашу електронну пошту нижче. Ви отримаєте лист із інструкціями щодо відновлення пароля. Щоб керувати всіма користувачами, ',
      adminLink: 'увійдіть в адмін-панель',
      emailLabel: 'Адреса електронної пошти',
      emailRequired: 'Будь ласка, вкажіть електронну пошту.',
      submit: 'Відновити пароль',
      genericError: 'Під час відправки листа для скидання пароля виникла проблема. Спробуйте ще раз.',
      successTitle: 'Запит надіслано',
      successText: 'Перевірте вашу пошту — там буде посилання для безпечного відновлення пароля.',
    },
    ru: {
      title: 'Восстановление пароля',
      description:
        'Пожалуйста, введите адрес электронной почты ниже. Вы получите письмо с инструкциями по восстановлению пароля. Чтобы управлять всеми пользователями, ',
      adminLink: 'войдите в админ-панель',
      emailLabel: 'Адрес электронной почты',
      emailRequired: 'Пожалуйста, укажите электронную почту.',
      submit: 'Восстановить пароль',
      genericError: 'При отправке письма для сброса пароля произошла проблема. Попробуйте еще раз.',
      successTitle: 'Запрос отправлен',
      successText: 'Проверьте свою почту — там будет ссылка для безопасного сброса пароля.',
    },
  }[locale]

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(async (data: FormData) => {
    const response = await fetch(
      '/api/users/forgot-password',
      {
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    )

    if (response.ok) {
      setSuccess(true)
      setError('')
    } else {
      setError(text.genericError)
    }
  }, [text.genericError])

  return (
    <Fragment>
      {!success && (
        <React.Fragment>
          <h1 className="text-xl mb-4">{text.title}</h1>
          <div className="prose dark:prose-invert mb-8">
            <p>
              {text.description}
              <Link href="/admin/collections/users">{text.adminLink}</Link>.
            </p>
          </div>
          <form className="max-w-lg" onSubmit={handleSubmit(onSubmit)}>
            <Message className="mb-8" error={error} />

            <FormItem className="mb-8">
              <Label htmlFor="email" className="mb-2">
                {text.emailLabel}
              </Label>
              <Input
                id="email"
                {...register('email', { required: text.emailRequired })}
                type="email"
              />
              {errors.email && <FormError message={errors.email.message} />}
            </FormItem>

            <Button type="submit" variant="default">
              {text.submit}
            </Button>
          </form>
        </React.Fragment>
      )}
      {success && (
        <React.Fragment>
          <h1 className="text-xl mb-4">{text.successTitle}</h1>
          <div className="prose dark:prose-invert">
            <p>{text.successText}</p>
          </div>
        </React.Fragment>
      )}
    </Fragment>
  )
}
