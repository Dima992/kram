'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Loader2, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'

type Lang = 'ua' | 'ru'
type Mode = 'full' | 'quick'
type Carrier = 'nova_poshta' | 'ukrposhta'
type PayMethod = 'liqpay' | 'iban' | 'cod'

const dictionary = {
  ua: {
    back: 'Назад до магазину',
    title: 'Оформлення замовлення',
    secure: 'Захищене з’єднання',
    modeFull: 'Повне оформлення',
    modeQuick: 'Швидке замовлення в 1 клік',
    quickDesc: 'Вкажіть телефон, і менеджер уточнить усі деталі доставки.',
    contacts: '1. Контактні дані',
    name: 'Ім’я',
    phone: 'Номер телефону',
    delivery: '2. Спосіб доставки',
    np: 'Нова Пошта',
    ukr: 'Укрпошта',
    city: 'Населений пункт',
    cityPlaceholder: 'Введіть місто (наприклад, Вінниця)...',
    warehouse: 'Відділення або поштомат',
    warehousePlaceholder: 'Введіть № або адресу відділення...',
    postcode: 'Поштовий індекс (5 цифр)',
    address: 'Область, місто/село та адреса',
    payment: '3. Спосіб оплати',
    liqpayTitle: 'Онлайн-оплата (LiqPay / Apple Pay / Google Pay)',
    liqpayDesc: '100% предоплата без комісії за переказ',
    ibanTitle: 'Оплата на розрахунковий рахунок (IBAN)',
    ibanDesc: 'Реквізити ФОП будуть надіслані після підтвердження',
    codTitle: 'Накладений платіж (Оплата при отриманні)',
    codDescNP: 'Предоплата 200 грн (покриття доставки), решта при отриманні.',
    codDescUkr: 'Для Укрпошти накладений платіж недоступний.',
    orderSummary: 'Ваше замовлення',
    total: 'Всього до сплати',
    prepaymentNotice: 'До сплати зараз (Предоплата): 200 ₴',
    codNotice: 'Залишок при отриманні у НП: ',
    btnSubmit: 'Підтвердити замовлення',
    btnQuickSubmit: 'Оформити в 1 клік',
    successTitle: 'Дякуємо за замовлення!',
    successDesc: 'Ваше замовлення успішно створено. Менеджер зв’яжеться з вами найближчим часом.',
    orderNumber: 'Номер замовлення:',
  },
  ru: {
    back: 'Назад в магазин',
    title: 'Оформление заказа',
    secure: 'Защищенное соединение',
    modeFull: 'Полное оформление',
    modeQuick: 'Быстрый заказ в 1 клик',
    quickDesc: 'Укажите телефон, и менеджер уточник все детали доставки.',
    contacts: '1. Контактные данные',
    name: 'Имя',
    phone: 'Номер телефона',
    delivery: '2. Способ доставки',
    np: 'Новая Почта',
    ukr: 'Укрпочта',
    city: 'Населенный пункт',
    cityPlaceholder: 'Введите город (например, Винница)...',
    warehouse: 'Отделение или почтомат',
    warehousePlaceholder: 'Введите № или адрес отделения...',
    postcode: 'Почтовый индекс (5 цифр)',
    address: 'Область, город/село и адрес',
    payment: '3. Способ оплаты',
    liqpayTitle: 'Онлайн-оплата (LiqPay / Apple Pay / Google Pay)',
    liqpayDesc: '100% предоплата без комиссии за перевод',
    ibanTitle: 'Оплата на расчетный счет (IBAN)',
    ibanDesc: 'Реквизиты ФОП будут отправлены после подтверждения',
    codTitle: 'Наложенный платеж (Оплата при получении)',
    codDescNP: 'Предоплата 200 грн (покрытие доставки), остаток при получении.',
    codDescUkr: 'Для Укрпочты наложенный платеж недоступен.',
    orderSummary: 'Ваш заказ',
    total: 'Всего к оплате',
    prepaymentNotice: 'К оплате сейчас (Предоплата): 200 ₴',
    codNotice: 'Остаток при получении на НП: ',
    btnSubmit: 'Подтвердить заказ',
    btnQuickSubmit: 'Оформить в 1 клик',
    successTitle: 'Спасибо за заказ!',
    successDesc: 'Ваш заказ успешно создан. Менеджер свяжется с вами в ближайшее время.',
    orderNumber: 'Номер заказа:',
  },
}

export function UACheckoutPage() {
  const [lang, setLang] = useState<Lang>('ua')
  const [mode, setMode] = useState<Mode>('full')
  const [carrier, setCarrier] = useState<Carrier>('nova_poshta')
  const [payMethod, setPayMethod] = useState<PayMethod>('liqpay')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [postcode, setPostcode] = useState('')
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  const t = dictionary[lang]
  const totalAmount = 3850

  const handleCarrierChange = (newCarrier: Carrier) => {
    setCarrier(newCarrier)
    if (newCarrier === 'ukrposhta' && payMethod === 'cod') {
      setPayMethod('liqpay')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      alert('Будь ласка, вкажіть номер телефону!')
      return
    }
    setIsLoading(true)

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: mode,
          customerName: name || 'Клієнт',
          phone,
          deliveryCarrier: carrier,
          deliveryDetails: {
            city,
            warehouse,
            postcode,
            address,
          },
          paymentMethod: payMethod,
          items: [{ productTitle: 'Демо товар', price: totalAmount, quantity: 1 }],
          totalAmount,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setCreatedOrderId(data.orderId)
      } else {
        alert('Помилка при створенні замовлення. Спробуйте ще раз.')
      }
    } catch (err) {
      console.error(err)
      alert('Сталася помилка. Перевірте з’єднання.')
    } finally {
      setIsLoading(false)
    }
  }

  if (createdOrderId) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold">{t.successTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.successDesc}</p>
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-semibold">
          {t.orderNumber} <span className="text-emerald-600">#{createdOrderId}</span>
        </div>
        <Link href="/" className="inline-block mt-4 text-sm underline text-muted-foreground hover:text-foreground">
          {t.back}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-7xl mx-auto px-4 py-8 text-zinc-900 dark:text-zinc-100">
      <div className="mb-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-50 dark:bg-zinc-900 text-xs">
            <button
              type="button"
              onClick={() => setLang('ua')}
              className={`px-2.5 py-1 rounded-md transition ${lang === 'ua' ? 'bg-white dark:bg-zinc-800 font-bold shadow-sm' : 'text-zinc-500'}`}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => setLang('ru')}
              className={`px-2.5 py-1 rounded-md transition ${lang === 'ru' ? 'bg-white dark:bg-zinc-800 font-bold shadow-sm' : 'text-zinc-500'}`}
            >
              RU
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="h-4 w-4" /> {t.secure}
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-3 max-w-md">
        <button
          type="button"
          onClick={() => setMode('full')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold border transition ${
            mode === 'full' ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900'
          }`}
        >
          {t.modeFull}
        </button>
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
            mode === 'quick' ? 'border-amber-500 bg-amber-500 text-white' : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900'
          }`}
        >
          <Zap className="h-4 w-4 fill-current" /> {t.modeQuick}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {mode === 'quick' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 dark:border-amber-900/50 dark:bg-amber-950/10 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" /> {t.modeQuick}
              </h2>
              <p className="text-xs text-muted-foreground">{t.quickDesc}</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Олена"
                    className="w-full mt-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">{t.phone} *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380 (97) 000-00-00"
                    className="w-full mt-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-4">
                <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">{t.contacts}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium">{t.name}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Олена"
                      className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t.phone} *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+380 (97) 000-00-00"
                      className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-4">
                <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">{t.delivery}</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => handleCarrierChange('nova_poshta')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold border transition ${
                      carrier === 'nova_poshta'
                        ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30'
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-red-500" /> {t.np}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCarrierChange('ukrposhta')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold border transition ${
                      carrier === 'ukrposhta'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-amber-500" /> {t.ukr}
                  </button>
                </div>

                {carrier === 'nova_poshta' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">{t.city}</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t.cityPlaceholder}
                        className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t.warehouse}</label>
                      <input
                        type="text"
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        placeholder={t.warehousePlaceholder}
                        className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">{t.postcode}</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                        placeholder="21000"
                        className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t.address}</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Вінницька обл., м. Вінниця, вул. Соборна, 1"
                        className="w-full mt-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-4">
                <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">{t.payment}</h2>
                <div className="space-y-3">
                  <label
                    onClick={() => setPayMethod('liqpay')}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                      payMethod === 'liqpay' ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <input type="radio" checked={payMethod === 'liqpay'} onChange={() => {}} className="mt-1 accent-emerald-600" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{t.liqpayTitle}</span>
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.liqpayDesc}</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setPayMethod('iban')}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                      payMethod === 'iban' ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <input type="radio" checked={payMethod === 'iban'} onChange={() => {}} className="mt-1 accent-emerald-600" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{t.ibanTitle}</span>
                        <Building2 className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.ibanDesc}</div>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      if (carrier === 'nova_poshta') setPayMethod('cod')
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                      carrier === 'ukrposhta'
                        ? 'opacity-50 cursor-not-allowed border-zinc-200 bg-zinc-50'
                        : payMethod === 'cod'
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-pointer'
                        : 'border-zinc-200 dark:border-zinc-800 cursor-pointer'
                    }`}
                  >
                    <input type="radio" disabled={carrier === 'ukrposhta'} checked={payMethod === 'cod'} onChange={() => {}} className="mt-1 accent-emerald-600" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold">{t.codTitle}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {carrier === 'nova_poshta' ? t.codDescNP : t.codDescUkr}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-6">
            <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">{t.orderSummary}</h2>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>{t.total}</span>
                <span>{totalAmount} ₴</span>
              </div>

              {mode === 'full' && payMethod === 'cod' && carrier === 'nova_poshta' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300 space-y-1">
                  <div className="font-semibold">{t.prepaymentNotice}</div>
                  <div>{t.codNotice} <strong>{totalAmount - 200} ₴</strong></div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 shadow-sm transition flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'quick' ? t.btnQuickSubmit : t.btnSubmit}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}