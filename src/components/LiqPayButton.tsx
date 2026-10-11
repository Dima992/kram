'use client'

import { Button } from '@/components/ui/button'
import { CreditCard, ShieldCheck } from 'lucide-react'

interface LiqPayButtonProps {
  amount: number
  orderId: string
  description: string
}

export function LiqPayButton({ amount, orderId, description }: LiqPayButtonProps) {
  const handlePayment = async () => {
    // В реальном заказе здесь запрос к серверному эндпоинту за сгенерированной формой
    alert(`Перехід до оплати замовлення #${orderId} на суму ${amount} ₴...`)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Оплата карткою / Apple Pay</h3>
            <p className="text-xs text-muted-foreground">Безпечний платіж через LiqPay</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>256-bit SSL</span>
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={handlePayment}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 shadow-sm transition"
        >
          Сплатити {amount} ₴
        </Button>
      </div>
    </div>
  )
}