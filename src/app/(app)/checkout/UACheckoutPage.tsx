'use client'

import { NovaPoshtaSelect, type NPDelivery } from '@/components/NovaPoshtaSelect'
import { Media } from '@/components/Media'
import { Button } from '@/components/ui/button'
import type { Cart, Media as MediaType, Variant } from '@/payload-types'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { ArrowLeft, Building2, CreditCard, ShieldCheck, ShoppingBag, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Lang = 'ua' | 'ru'
type Mode = 'full' | 'quick'
type Carrier = 'nova_poshta' | 'ukrposhta'
type PayMethod = 'liqpay' | 'iban' | 'cod'
type CartItems = NonNullable<Cart['items']>

type CheckoutLine = {
  key: string
  productId: string
  variantId: string | null
  title: string
  options: string
  image: MediaType | undefined
  quantity: number
  price: number | null
  available: boolean
}

const dictionary = {
  ua: {
    back: 'Назад до магазину',
    secure: 'Захищене з’єднання',
    modeFull: 'Повне оформлення',
    modeQuick: 'Швидке замовлення в 1 клік',
    quickDesc: 'Вкажіть телефон, і менеджер уточнить усі деталі доставки.',
    contacts: '1. Контактні дані',
    name: 'Ім’я',
    phone: 'Номер телефону',
    phoneRequired: 'Вкажіть номер телефону!',
    npRequired: 'Оберіть місто та відділення Нової пошти',
    cartEmpty: 'Ваш кошик порожній.',
    goShop: 'Перейти до каталогу',
    cartTitle: 'Ваш кошик',
    unavailable: 'Немає в наявності',
    unavailableLine: 'Деякі товари в кошику недоступні. Видаліть їх або оберіть інший варіант.',
    customerDefault: 'Клієнт',
    orderError: 'Не вдалося створити замовлення.',
    orderSubmitError: 'Сталася помилка. Спробуйте ще раз.',
    delivery: '2. Спосіб доставки',
    np: 'Нова Пошта',
    ukr: 'Укрпошта',
    postcode: 'Поштовий індекс (5 цифр)',
    address: 'Область, місто/село та адреса відділення',
    payment: '3. Спосіб оплати',
    liqpayTitle: 'Онлайн-оплата карткою / Apple Pay / Google Pay (LiqPay)',
    liqpayDesc: '100% предоплата без комісії за переказ',
    ibanTitle: 'Оплата на розрахунковий рахунок (IBAN)',
    ibanDesc: 'Реквізити ФОП будуть надіслані після підтвердження',
    codTitle: 'Накладений платіж (Оплата при отриманні)',
    codDescNP: 'Предоплата 200 грн на карту/LiqPay (покриття доставки), решта при отриманні.',
    codDescUkr: 'Для Укрпошти накладений платіж недоступний. Оберіть 100% предоплату.',
    orderSummary: 'Ваше замовлення',
    total: 'Всього до сплати',
    prepaymentNotice: 'До сплати зараз (Предоплата): 200 ₴',
    codNotice: 'Залишок при отриманні у НП: ',
    btnSubmit: 'Підтвердити замовлення',
    btnQuickSubmit: 'Оформити в 1 клік',
    thanks: 'Дякуємо за замовлення!',
    orderNumber: 'Номер замовлення:',
    payLiqpay: 'Перейти до оплати LiqPay',
  },
  ru: {
    back: 'Назад в магазин',
    secure: 'Защищенное соединение',
    modeFull: 'Полное оформление',
    modeQuick: 'Быстрый заказ в 1 клик',
    quickDesc: 'Укажите телефон, и менеджер уточнит все детали доставки.',
    contacts: '1. Контактные данные',
    name: 'Имя',
    phone: 'Номер телефона',
    phoneRequired: 'Укажите номер телефона!',
    npRequired: 'Выберите город и отделение Новой почты',
    cartEmpty: 'Ваша корзина пуста.',
    goShop: 'Перейти в каталог',
    cartTitle: 'Ваша корзина',
    unavailable: 'Нет в наличии',
    unavailableLine: 'Некоторые товары в корзине недоступны. Удалите их или выберите другой вариант.',
    customerDefault: 'Клиент',
    orderError: 'Не удалось создать заказ.',
    orderSubmitError: 'Произошла ошибка. Попробуйте еще раз.',
    delivery: '2. Способ доставки',
    np: 'Новая Почта',
    ukr: 'Укрпочта',
    postcode: 'Почтовый индекс (5 цифр)',
    address: 'Область, город/село и адрес отделения',
    payment: '3. Способ оплаты',
    liqpayTitle: 'Онлайн-оплата картой / Apple Pay / Google Pay (LiqPay)',
    liqpayDesc: '100% предоплата без комиссии за перевод',
    ibanTitle: 'Оплата на расчетный счет (IBAN)',
    ibanDesc: 'Реквизиты ФОП будут отправлены после подтверждения',
    codTitle: 'Наложенный платеж (Оплата при получении)',
    codDescNP: 'Предоплата 200 грн на карту/LiqPay (покрытие доставки), остаток при получении.',
    codDescUkr: 'Для Укрпочты наложенный платеж недоступен. Выберите 100% предоплату.',
    orderSummary: 'Ваш заказ',
    total: 'Всего к оплате',
    prepaymentNotice: 'К оплате сейчас (Предоплата): 200 ₴',
    codNotice: 'Остаток при получении на НП: ',
    btnSubmit: 'Подтвердить заказ',
    btnQuickSubmit: 'Оформить в 1 клик',
    thanks: 'Спасибо за заказ!',
    orderNumber: 'Номер заказа:',
    payLiqpay: 'Перейти к оплате LiqPay',
  },
}

function buildLines(items: CartItems): CheckoutLine[] {
  return items.flatMap((item, index) => {
    const product = item.product
    if (typeof product !== 'object' || !product) return []

    const quantity = item.quantity || 0
    const variant: Variant | null =
      typeof item.variant === 'object' && item.variant ? item.variant : null

    const options = (variant?.options || [])
      .map((option) => (typeof option === 'object' ? option.label : ''))
      .filter(Boolean)
      .join(', ')

    let available = true
    if (variant) {
      available = typeof variant.inventory === 'number' && variant.inventory > 0
    } else if (product.enableVariants) {
      available = false
    }

    const price =
      variant && typeof variant.priceInUAH === 'number' && variant.priceInUAH > 0
        ? variant.priceInUAH
        : typeof product.priceInUAH === 'number' && product.priceInUAH > 0
          ? product.priceInUAH
          : null
    if (price === null) available = false

    let image: MediaType | undefined =
      typeof product.gallery?.[0]?.image === 'object' ? product.gallery[0].image : undefined

    if (variant) {
      const variantOptionIDs = (variant.options || []).map((option) =>
        typeof option === 'object' ? option.id : option,
      )
      const imageVariant = product.gallery?.find((galleryItem) => {
        if (!galleryItem.variantOption) return false
        const id =
          typeof galleryItem.variantOption === 'object'
            ? galleryItem.variantOption.id
            : galleryItem.variantOption
        return variantOptionIDs.includes(id)
      })
      if (imageVariant && typeof imageVariant.image === 'object') image = imageVariant.image
    }

    return [
      {
        key: `${item.id ?? index}`,
        productId: String(product.id),
        variantId: variant ? String(variant.id) : null,
        title: product.title,
        options,
        image,
        quantity,
        price,
        available,
      },
    ]
  })
}

export function UACheckoutPage() {
  const cartApi = useCart() as ReturnType<typeof useCart> & { clearCart?: () => Promise<unknown> }
  const { cart } = cartApi

  const [lang, setLang] = useState<Lang>('ua')
  const [mode, setMode] = useState<Mode>('full')
  const [carrier, setCarrier] = useState<Carrier>('nova_poshta')
  const [payMethod, setPayMethod] = useState<PayMethod>('liqpay')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [npDelivery, setNpDelivery] = useState<NPDelivery | null>(null)
  const [postcode, setPostcode] = useState('')
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [liqpayPayment, setLiqpayPayment] = useState<{
    data: string
    signature: string
    checkoutUrl: string
  } | null>(null)

  const t = dictionary[lang]
  const lines = buildLines((cart?.items || []) as CartItems)
  const hasUnavailable = lines.some((line) => !line.available)
  const totalAmount = lines.reduce(
    (sum, line) => sum + (line.available && line.price ? line.price * line.quantity : 0),
    0,
  )

  useEffect(() => {
    const returnedOrderId = new URLSearchParams(window.location.search).get('orderId')
    if (returnedOrderId) setCreatedOrderId(returnedOrderId)
  }, [])

  const handleCarrierChange = (newCarrier: Carrier) => {
    setCarrier(newCarrier)
    if (newCarrier === 'ukrposhta' && payMethod === 'cod') {
      setPayMethod('liqpay')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!phone) {
      alert(t.phoneRequired)
      return
    }
    if (carrier === 'nova_poshta' && !npDelivery) {
      alert(t.npRequired)
      return
    }
    if (lines.length === 0 || hasUnavailable) {
      alert(t.unavailableLine)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': lang },
        body: JSON.stringify({
          orderType: mode,
          customerName: name || t.customerDefault,
          phone,
          deliveryCarrier: carrier,
          deliveryDetails: carrier === 'nova_poshta' ? npDelivery : { postcode, address },
          paymentMethod: payMethod,
          items: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || t.orderError)
      }

      setCreatedOrderId(String(result.orderId))
      setLiqpayPayment(result.liqpayPayment || null)
      await cartApi.clearCart?.()
    } catch (error) {
      console.error('Не вдалося оформити замовлення:', error)
      alert(error instanceof Error ? error.message : t.orderSubmitError)
    } finally {
      setIsLoading(false)
    }
  }

  if (createdOrderId) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <h1 className="text-2xl font-bold">{t.thanks}</h1>
        <p className="text-sm text-muted-foreground">
          {t.orderNumber} <strong>#{createdOrderId}</strong>
        </p>
        {liqpayPayment && (
          <form action={liqpayPayment.checkoutUrl} method="POST">
            <input type="hidden" name="data" value={liqpayPayment.data} />
            <input type="hidden" name="signature" value={liqpayPayment.signature} />
            <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
              {t.payLiqpay}
            </Button>
          </form>
        )}
        <Link href="/" className="block text-sm underline text-muted-foreground hover:text-foreground">
          {t.back}
        </Link>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <ShoppingBag className="h-16 w-16 mx-auto text-zinc-400" />
        <p className="text-xl font-bold">{t.cartEmpty}</p>
        <Button asChild>
          <Link href="/shop">{t.goShop}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-7xl mx-auto px-4 py-8 text-zinc-900 dark:text-zinc-100"
    >
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
                    <label className="text-xs font-medium">{t.phone}</label>
                    <input
                      type="tel"
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
                  <NovaPoshtaSelect onChange={setNpDelivery} />
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
            <h2 className="text-base font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-3">
              {t.cartTitle}
            </h2>

            <div className="space-y-4">
              {lines.map((line) => (
                <div key={line.key} className="flex items-start gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                    {line.image && (
                      <Media className="" fill imgClassName="rounded-lg object-cover" resource={line.image} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{line.title}</p>
                    {line.options && <p className="text-xs text-muted-foreground">{line.options}</p>}
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} × {line.price ?? '—'} ₴
                    </p>
                    {!line.available && <p className="text-xs font-medium text-red-600">{t.unavailable}</p>}
                  </div>
                  <div className="text-sm font-medium">
                    {line.available && line.price ? line.price * line.quantity : 0} ₴
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>{t.total}</span>
                <span>{totalAmount} ₴</span>
              </div>

              {mode === 'full' && payMethod === 'cod' && carrier === 'nova_poshta' && (
                <div className="rounded-xl bg-amber-50 border