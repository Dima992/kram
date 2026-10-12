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
import React, { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
  password: string
  passwordConfirm: string
}

export const CreateAccountForm: React.FC = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const localePrefix = locale === 'ru' ? '/ru' : ''
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const { login } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const text = {
    uk: {
      intro:
        'Тут нові клієнти можуть зареєструватися та створити новий обліковий запис. Щоб керувати всіма користувачами, ',
      adminLink: 'увійдіть в адмін-панель',
      emailLabel: 'Адреса електронної пошти',
      emailRequired: 'Потрібна електронна пошта.',
      passwordLabel: 'Новий пароль',
      passwordRequired: 'Потрібен пароль.',
      confirmLabel: 'Підтвердьте пароль',
      confirmRequired: 'Будь ласка, підтвердіть пароль.',
      passwordMismatch: 'Паролі не співпадають',
      submit: 'Створити акаунт',
      processing: 'Обробка...',
      alreadyHaveAccount: 'Вже маєте акаунт?',
      loginLink: 'Увійти',
      accountCreated: 'Обліковий запис успішно створено',
      errorCreate: 'Під час створення облікового запису сталася помилка.',
      invalidCredentials: 'Сталася помилка з наданими обліковими даними. Спробуйте ще раз.',
      responseDefault: 'Під час створення облікового запису сталася помилка.',
    },
    ru: {
      intro:
        'Здесь новые клиенты могут зарегистрироваться и создать новый аккаунт. Чтобы управлять всеми пользователями, ',
      adminLink: 'войдите в админ-панель',
      emailLabel: 'Адрес электронной почты',
      emailRequired: 'Требуется электронная почта.',
      passwordLabel: 'Новый пароль',
      passwordRequired: 'Требуется пароль.',
      confirmLabel: 'Подтвердите пароль',
      confirmRequired: 'Пожалуйста, подтвердите пароль.',
      passwordMismatch: 'Пароли не совпадают',
      submit: 'Создать аккаунт',
      processing: 'Обработка...',
      alreadyHaveAccount: 'Уже есть аккаунт?',
      loginLink: 'Войти',
      accountCreated: 'Аккаунт успешно создан',
      errorCreate: 'Во время создания аккаунта произошла ошибка.',
      invalidCredentials: 'Произошла ошибка с предоставленными учетными данными. Попробуйте еще раз.',
      responseDefault: 'Во время создания аккаунта произошла ошибка.',
    },
  }[locale]

  const {
    formState: { errors },
    handleSubmit,
    register,
    watch,
  } = useForm<FormData>()

  const password = useRef({})
  password.current = watch('password', '')

  const onSubmit = useCallback(
    async (data: FormData) => {
      const response = await fetch('/api/users', {
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        const message = response.statusText || text.responseDefault
        setError(message)
        return
      }

      const redirect = getSafeRedirect({
        fallbackTo: `${localePrefix}/account?success=${encodeURIComponent(text.accountCreated)}`,
        redirectTo: searchParams.get('redirect') ?? '',
      })

      const timer = setTimeout(() => {
        setLoading(true)
      }, 1000)

      try {
        await login(data)
        clearTimeout(timer)
        router.push(redirect)
      } catch (_) {
        clearTimeout(timer)
        setError(text.invalidCredentials)
      }
    },
    [login, router, searchParams, text],
  )

  return (
    <form className="max-w-lg py-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="prose dark:prose-invert mb-6">
        <p>
          {text.intro}
          <Link href="/admin/collections/users">{text.adminLink}</Link>.
        </p>
      </div>

      <Message error={error} />

      <div className="flex flex-col gap-8 mb-8">
        <FormItem>
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

        <FormItem>
          <Label htmlFor="password" className="mb-2">
            {text.passwordLabel}
          </Label>
          <Input
            id="password"
            {...register('password', { required: text.passwordRequired })}
            type="password"
          />
          {errors.password && <FormError message={errors.password.message} />}
        </FormItem>

        <FormItem>
          <Label htmlFor="passwordConfirm" className="mb-2">
            {text.confirmLabel}
          </Label>
          <Input
            id="passwordConfirm"
            {...register('passwordConfirm', {
              required: text.confirmRequired,
              validate: (value) => value === password.current || text.passwordMismatch,
            })}
            type="password"
          />
          {errors.passwordConfirm && <FormError message={errors.passwordConfirm.message} />}
        </FormItem>
      </div>
      <Button disabled={loading} type="submit" variant="default">
        {loading ? text.processing : text.submit}
      </Button>

      <div className="prose dark:prose-invert mt-8">
        <p>
          {text.alreadyHaveAccount}{' '}
          <Link href={`${localePrefix}/login${allParams}`}>{text.loginLink}</Link>
        </p>
      </div>
    </form>
  )
}
