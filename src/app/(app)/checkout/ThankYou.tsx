'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  orderId: string
  lang: 'ua' | 'ru'
  liqpayPayment: { data: string; signature: string; checkoutUrl: string } | null
}

const t = {
  ua: {
    title: 'Дякуємо за замовлення!',
    number: 'Номер замовлення',
    paid: 'Оплату отримано. Ми вже готуємо ваше замовлення.',
    checking: 'Підтверджуємо оплату...',
    pending: 'Оплата ще обробляється. Оновіть сторінку за кілька хвилин або зверніться до нас.',
    payAgain: 'Перейти до оплати',
    shop: 'Продовжити покупки',
    home: 'На головну',
  },
  ru: {
    title: 'Спасибо за заказ!',
    number: 'Номер заказа',
    paid: 'Оплату получили. Мы уже готовим ваш заказ.',
    checking: 'Подтверждаем оплату...',
    pending: 'Оплата ещё обрабатывается. Обновите страницу через несколько минут или свяжитесь с нами.',
    payAgain: 'Перейти к оплате',
    shop: 'Продолжить покупки',
    home: 'На главную',
  },
}

const MAX_CHECKS = 40 // около 3 минут, потом показываем «обрабатывается»
const INTERVAL_MS = 4000

export function ThankYou({ orderId, lang, liqpayPayment }: Props) {
  const text = t[lang]
  const [paid, setPaid] = useState(false)
  const [checks, setChecks] = useState(0)

  useEffect(() => {
    if (paid || checks >= MAX_CHECKS) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        })
        const result = await response.json()
        if (cancelled) return
        if (result.paid) setPaid(true)
      } catch {
        // Сеть могла моргнуть: попробуем ещё раз при следующей проверке
      }
      if (!cancelled) setChecks((count) => count + 1)
    }, INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId, paid, checks])

  const finished = paid || checks >= MAX_CHECKS

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
          {paid ? (
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          ) : (
            <Loader2 className={`h-9 w-9 text-zinc-400 ${finished ? '' : 'animate-spin'}`} />
          )}
        </div>

        <h1 className="text-2xl font-bold">{text.title}</h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {text.number}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">#{orderId}</span>
        </p>

        <p className="mt-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {paid ? text.paid : finished ? text.pending : text.checking}
        </p>

        {!paid && liqpayPayment && (
          <form action={liqpayPayment.checkoutUrl} method="POST" className="mt-6">
            <input type="hidden" name="data" value={liqpayPayment.data} />
            <input type="hidden" name="signature" value={liqpayPayment.signature} />
            <Button type="submit" className="w-full rounded-xl bg-emerald-600 py-6 font-semibold text-white hover:bg-emerald-700">
              {text.payAgain}
            </Button>
          </form>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild className="w-full rounded-xl py-6">
            <Link href="/shop">{text.shop}</Link>
          </Button>
          <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">
            {text.home}
          </Link>
        </div>
      </div>
    </div>
  )
}