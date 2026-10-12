'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User } from '@/payload-types'
import { useAuth } from '@/providers/Auth'
import { usePathname, useRouter } from 'next/navigation'
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type FormData = {
  email: string
  name: User['name']
  password: string
  passwordConfirm: string
}

export const AccountForm: React.FC = () => {
  const { setUser, user } = useAuth()
  const [changePassword, setChangePassword] = useState(false)
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'

  const text = {
    uk: {
      intro: 'Змініть дані свого облікового запису нижче або ',
      changePassword: 'натисніть тут',
      changePasswordAction: 'щоб змінити пароль.',
      emailLabel: 'Електронна пошта',
      emailRequired: 'Будь ласка, вкажіть електронну пошту.',
      nameLabel: 'Ім’я',
      nameRequired: 'Будь ласка, вкажіть ім’я.',
      passwordDescription: 'Змініть пароль нижче або ',
      cancel: 'скасувати',
      newPasswordLabel: 'Новий пароль',
      newPasswordRequired: 'Будь ласка, введіть новий пароль.',
      confirmPasswordLabel: 'Підтвердьте пароль',
      confirmPasswordRequired: 'Будь ласка, підтвердьте новий пароль.',
      passwordMismatch: 'Паролі не співпадають.',
      processing: 'Обробка...',
      updateAccount: 'Оновити акаунт',
      changePasswordTitle: 'Змінити пароль',
      success: 'Обліковий запис успішно оновлено.',
      error: 'Під час оновлення облікового запису виникла проблема.',
      mustLogin: 'Ви повинні увійти, щоб переглянути цю сторінку.',
    },
    ru: {
      intro: 'Измените данные учетной записи ниже или ',
      changePassword: 'нажмите здесь',
      changePasswordAction: 'чтобы сменить пароль.',
      emailLabel: 'Электронная почта',
      emailRequired: 'Пожалуйста, укажите электронную почту.',
      nameLabel: 'Имя',
      nameRequired: 'Пожалуйста, укажите имя.',
      passwordDescription: 'Измените пароль ниже или ',
      cancel: 'отмена',
      newPasswordLabel: 'Новый пароль',
      newPasswordRequired: 'Пожалуйста, введите новый пароль.',
      confirmPasswordLabel: 'Подтвердите пароль',
      confirmPasswordRequired: 'Пожалуйста, подтвердите новый пароль.',
      passwordMismatch: 'Пароли не совпадают.',
      processing: 'Обработка...',
      updateAccount: 'Обновить аккаунт',
      changePasswordTitle: 'Сменить пароль',
      success: 'Аккаунт успешно обновлен.',
      error: 'При обновлении аккаунта произошла проблема.',
      mustLogin: 'Вы должны войти, чтобы просмотреть эту страницу.',
    },
  }[locale]

  const {
    formState: { errors, isLoading, isSubmitting, isDirty },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<FormData>()

  const password = useRef({})
  password.current = watch('password', '')

  const router = useRouter()

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (user) {
        const response = await fetch(`/api/users/${user.id}`, {
          // Make sure to include cookies with fetch
          body: JSON.stringify(data),
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'PATCH',
        })

        if (response.ok) {
          const json = await response.json()
          setUser(json.doc)
          toast.success(text.success)
          setChangePassword(false)
          reset({
            name: json.doc.name,
            email: json.doc.email,
            password: '',
            passwordConfirm: '',
          })
        } else {
          toast.error(text.error)
        }
      }
    },
    [user, setUser, reset, text.error],
  )

  useEffect(() => {
    if (user === null) {
      router.push(
        `/login?error=${encodeURIComponent(text.mustLogin)}&redirect=${encodeURIComponent('/account')}`,
      )
    }

    // Once user is loaded, reset form to have default values
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: '',
        passwordConfirm: '',
      })
    }
  }, [user, router, reset, changePassword, text.mustLogin])

  return (
    <form className="max-w-xl" onSubmit={handleSubmit(onSubmit)}>
      {!changePassword ? (
        <Fragment>
          <div className="prose dark:prose-invert mb-8">
            <p className="">
              {text.intro}
              <Button
                className="px-0 text-inherit underline hover:cursor-pointer"
                onClick={() => setChangePassword(!changePassword)}
                type="button"
                variant="link"
              >
                {text.changePassword}
              </Button>
              {text.changePasswordAction}
            </p>
          </div>

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
              <Label htmlFor="name" className="mb-2">
                {text.nameLabel}
              </Label>
              <Input
                id="name"
                {...register('name', { required: text.nameRequired })}
                type="text"
              />
              {errors.name && <FormError message={errors.name.message} />}
            </FormItem>
          </div>
        </Fragment>
      ) : (
        <Fragment>
          <div className="prose dark:prose-invert mb-8">
            <p>
              {text.passwordDescription}
              <Button
                className="px-0 text-inherit underline hover:cursor-pointer"
                onClick={() => setChangePassword(!changePassword)}
                type="button"
                variant="link"
              >
                {text.cancel}
              </Button>
              .
            </p>
          </div>

          <div className="flex flex-col gap-8 mb-8">
            <FormItem>
              <Label htmlFor="password" className="mb-2">
                {text.newPasswordLabel}
              </Label>
              <Input
                id="password"
                {...register('password', { required: text.newPasswordRequired })}
                type="password"
              />
              {errors.password && <FormError message={errors.password.message} />}
            </FormItem>

            <FormItem>
              <Label htmlFor="passwordConfirm" className="mb-2">
                {text.confirmPasswordLabel}
              </Label>
              <Input
                id="passwordConfirm"
                {...register('passwordConfirm', {
                  required: text.confirmPasswordRequired,
                  validate: (value) => value === password.current || text.passwordMismatch,
                })}
                type="password"
              />
              {errors.passwordConfirm && <FormError message={errors.passwordConfirm.message} />}
            </FormItem>
          </div>
        </Fragment>
      )}
      <Button disabled={isLoading || isSubmitting || !isDirty} type="submit" variant="default">
        {isLoading || isSubmitting
          ? text.processing
          : changePassword
            ? text.changePasswordTitle
            : text.updateAccount}
      </Button>
    </form>
  )
}
