'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/Auth'
import { usePathname } from 'next/navigation'
import React, { Fragment, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { sendOrderAccessEmail } from './sendOrderAccessEmail'

type FormData = {
  email: string
  orderID: string
}

type Props = {
  initialEmail?: string
}

export const FindOrderForm: React.FC<Props> = ({ initialEmail }) => {
  const pathname = usePathname()
  const locale = pathname.startsWith('/ru') ? 'ru' : 'uk'
  const text = {
    uk: {
      title: 'Перевірте свою пошту',
      successText:
        'Якщо замовлення існує для вказаної електронної пошти та ID замовлення, ми надіслали вам лист із посиланням для перегляду деталей замовлення.',
      heading: 'Знайти моє замовлення',
      intro: 'Будь ласка, введіть вашу електронну пошту та ID замовлення нижче. Ми надішлемо вам посилання для перегляду замовлення.',
      emailLabel: 'Адреса електронної пошти',
      emailRequired: 'Електронна пошта обов’язкова.',
      orderLabel: 'ID замовлення',
      orderRequired: 'ID замовлення обов’язковий.',
      genericError: 'Щось пішло не так. Спробуйте ще раз.',
      submitting: 'Надсилаємо...',
      submit: 'Знайти замовлення',
    },
    ru: {
      title: 'Проверьте свою почту',
      successText:
        'Если заказ существует для указанной электронной почты и ID заказа, мы отправили вам письмо со ссылкой для просмотра деталей заказа.',
      heading: 'Найти мой заказ',
      intro: 'Пожалуйста, введите вашу электронную почту и ID заказа ниже. Мы отправим вам ссылку для просмотра заказа.',
      emailLabel: 'Адрес электронной почты',
      emailRequired: 'Электронная почта обязательна.',
      orderLabel: 'ID заказа',
      orderRequired: 'ID заказа обязателен.',
      genericError: 'Что-то пошло не так. Попробуйте еще раз.',
      submitting: 'Отправляем...',
      submit: 'Найти заказ',
    },
  }[locale]
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>({
    defaultValues: {
      email: initialEmail || user?.email,
    },
  })

  const onSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await sendOrderAccessEmail({
        email: data.email,
        orderID: data.orderID,
        locale,
      })

      if (result.success) {
        setSuccess(true)
      } else {
        setSubmitError(result.error || text.genericError)
      }
    } catch {
      setSubmitError(text.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }, [text.genericError])

  if (success) {
    return (
      <Fragment>
        <h1 className="text-xl mb-4">{text.title}</h1>
        <div className="prose dark:prose-invert">
          <p>{text.successText}</p>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <h1 className="text-xl mb-4">{text.heading}</h1>
      <div className="prose dark:prose-invert mb-8">
        <p>{text.intro}</p>
      </div>
      <form className="max-w-lg flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
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
          <Label htmlFor="orderID" className="mb-2">
            {text.orderLabel}
          </Label>
          <Input
            id="orderID"
            {...register('orderID', {
              required: text.orderRequired,
            })}
            type="text"
          />
          {errors.orderID && <FormError message={errors.orderID.message} />}
        </FormItem>
        {submitError && <FormError message={submitError} />}
        <Button type="submit" className="self-start" variant="default" disabled={isSubmitting}>
          {isSubmitting ? text.submitting : text.submit}
        </Button>
      </form>
    </Fragment>
  )
}
