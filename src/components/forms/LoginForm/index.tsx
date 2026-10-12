'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getSafeRedirect } from 'payload/shared'
import React, { useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const redirect = useRef(
    getSafeRedirect({
      fallbackTo: `${localePrefix}/account`,
      redirectTo: searchParams.get('redirect') ?? '',
    }),
  )
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = React.useState<null | string>(null)

  const text = {
    uk: {
      emailLabel: 'Електронна пошта',
      emailRequired: 'Вкажіть адресу електронної пошти.',
      passwordLabel: 'Пароль',
      passwordRequired: 'Будь ласка, введіть пароль.',
      resetText: 'Забули пароль?',
      resetLink: 'Натисніть тут, щоб скинути',
      createButton: 'Створити акаунт',
      continue: 'Продовжити',
      error: 'Сталася помилка з наданими даними. Спробуйте ще раз.',
    },
    ru: {
      emailLabel: 'Электронная почта',
      emailRequired: 'Укажите адрес электронной почты.',
      passwordLabel: 'Пароль',
      passwordRequired: 'Пожалуйста, введите пароль.',
      resetText: 'Забыли пароль?',
      resetLink: 'Нажмите здесь, чтобы сбросить',
      createButton: 'Создать аккаунт',
      continue: 'Продолжить',
      error: 'Произошла ошибка с введенными данными. Попробуйте еще раз.',
    },
  }[locale]

  const {
    formState: { errors, isLoading },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        await login(data)
        router.push(redirect.current)
      } catch (_) {
        setError(text.error)
      }
    },
    [login, router, text.error],
  )

  return (
    <form className="" onSubmit={handleSubmit(onSubmit)}>
      <Message className="classes.message" error={error} />
      <div className="flex flex-col gap-8">
        <FormItem>
          <Label htmlFor="email">{text.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            {...register('email', { required: text.emailRequired })}
          />
          {errors.email && <FormError message={errors.email.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="password">{text.passwordLabel}</Label>
          <Input
            id="password"
            type="password"
            {...register('password', { required: text.passwordRequired })}
          />
          {errors.password && <FormError message={errors.password.message} />}
        </FormItem>

        <div className="text-primary/70 mb-6 prose prose-a:hover:text-primary dark:prose-invert">
          <p>
            {text.resetText}{' '}
            <Link href={`${localePrefix}/forgot-password${allParams}`}>{text.resetLink}</Link>
          </p>
        </div>
      </div>

      <div className="flex gap-4 justify-between">
        <Button asChild variant="outline" size="lg">
          <Link href={`${localePrefix}/create-account${allParams}`} className="grow max-w-[50%]">
            {text.createButton}
          </Link>
        </Button>
        <Button className="grow" disabled={isLoading} size="lg" type="submit" variant="default">
          {isLoading ? (locale === 'ru' ? 'Обработка...' : 'Обробка...') : text.continue}
        </Button>
      </div>
    </form>
  )
}
