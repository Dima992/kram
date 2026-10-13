import { generateLiqPayData } from '@/utilities/liqpay'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

type RequestedItem = {
  productId: string
  variantId?: string | null
  quantity: number
}

const orderMessages = {
  uk: {
    invalidOrder: 'Некоректні товари або спосіб оплати.',
    unavailableProducts: 'Один або декілька товарів недоступні для покупки.',
    variantRequired: 'Оберіть колір і розмір товару.',
    variantUnavailable: 'Обраного варіанта немає в наявності.',
    invalidAmount: 'Сума замовлення недійсна.',
    failedCreate: 'Не вдалося створити замовлення.',
    genericError: 'Сталася помилка при створенні замовлення.',
  },
  ru: {
    invalidOrder: 'Некорректные товары или способ оплаты.',
    unavailableProducts: 'Один или несколько товаров недоступны для покупки.',
    variantRequired: 'Выберите цвет и размер товара.',
    variantUnavailable: 'Выбранного варианта нет в наличии.',
    invalidAmount: 'Сумма заказа недействительна.',
    failedCreate: 'Не удалось создать заказ.',
    genericError: 'Произошла ошибка при создании заказа.',
  },
} as const

function getOrderLocale(request: Request) {
  const headerLocale = request.headers.get('x-locale')
  if (headerLocale === 'ru') return 'ru'
  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() ?? ''
  return acceptLanguage.includes('ru') ? 'ru' : 'uk'
}

function isRequestedItem(item: unknown): item is RequestedItem {
  if (typeof item !== 'object' || item === null) return false
  const candidate = item as Record<string, unknown>
  const variantOk =
    candidate.variantId === undefined ||
    candidate.variantId === null ||
    typeof candidate.variantId === 'string'

  return (
    typeof candidate.productId === 'string' &&
    variantOk &&
    typeof candidate.quantity === 'number' &&
    Number.isInteger(candidate.quantity) &&
    candidate.quantity > 0 &&
    candidate.quantity <= 99
  )
}

export async function POST(req: Request) {
  const locale = getOrderLocale(req)
  const messages = orderMessages[locale]
  const fail = (error: string, status = 400) =>
    NextResponse.json({ success: false, error }, { status })

  try {
    const body = await req.json()
    if (
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 50 ||
      !body.items.every(isRequestedItem) ||
      !['liqpay', 'iban', 'cod'].includes(body.paymentMethod) ||
      typeof body.phone !== 'string' ||
      !body.phone.trim()
    ) {
      return fail(messages.invalidOrder)
    }

    const payload = await getPayload({ config: configPromise })
    const requestedItems = body.items as RequestedItem[]

    const productIDs = [...new Set(requestedItems.map((item) => item.productId))]
    const variantIDs = [
      ...new Set(
        requestedItems
          .map((item) => item.variantId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]

    const { docs: products } = await payload.find({
      collection: 'products',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      where: {
        and: [{ id: { in: productIDs } }, { _status: { equals: 'published' } }],
      },
    })
    const productsByID = new Map(products.map((product) => [String(product.id), product]))

    const variants =
      variantIDs.length > 0
        ? (
            await payload.find({
              collection: 'variants',
              depth: 1,
              pagination: false,
              overrideAccess: true,
              where: { id: { in: variantIDs } },
            })
          ).docs
        : []
    const variantsByID = new Map(variants.map((variant) => [String(variant.id), variant]))

    const lines: {
      productID: string
      variantID?: string
      title: string
      options: string
      quantity: number
      price: number
    }[] = []

    for (const item of requestedItems) {
      const product = productsByID.get(item.productId)
      if (!product) return fail(messages.unavailableProducts)

      let variant
      if (item.variantId) {
        variant = variantsByID.get(item.variantId)
        const variantProductID =
          typeof variant?.product === 'object' ? variant.product.id : variant?.product

        if (!variant || String(variantProductID) !== String(product.id)) {
          return fail(messages.unavailableProducts)
        }
        if (!(typeof variant.inventory === 'number' && variant.inventory > 0)) {
          return fail(messages.variantUnavailable)
        }
      } else if (product.enableVariants) {
        return fail(messages.variantRequired)
      }

      const price =
        typeof variant?.priceInUAH === 'number' && variant.priceInUAH > 0
          ? variant.priceInUAH
          : product.priceInUAH

      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return fail(messages.unavailableProducts)
      }

      const options = (variant?.options || [])
        .map((option) => (typeof option === 'object' ? option.label : ''))
        .filter(Boolean)
        .join(', ')

      lines.push({
        productID: String(product.id),
        variantID: variant ? String(variant.id) : undefined,
        title: product.title,
        options,
        quantity: item.quantity,
        price,
      })
    }

    const totalAmount = lines.reduce((total, line) => total + line.price * line.quantity, 0)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return fail(messages.invalidAmount)
    }

    const newOrder = await payload.create({
      collection: 'orders',
      data: {
        status: 'new',
        orderType: body.orderType === 'quick' ? 'quick' : 'full',
        customerName: body.customerName,
        phone: body.phone,
        deliveryCarrier: body.deliveryCarrier,
        deliveryDetails: body.deliveryDetails,
        paymentMethod: body.paymentMethod,
        items: lines.map((line) => ({
          product: line.productID,
          ...(line.variantID ? { variant: line.variantID } : {}),
          quantity: line.quantity,
        })),
        totalAmount,
      },
    })

    let siteSettings
    try {
      siteSettings = await payload.findGlobal({
        slug: 'site-settings',
        overrideAccess: true,
      })
    } catch (error) {
      payload.logger.error({ err: error }, 'Could not load Site Settings for order integrations')
    }

    const botToken = siteSettings?.telegramBotToken
    const chatIds = siteSettings?.telegramChatId
      ?.split(',')
      .map((chatId) => chatId.trim())
      .filter(Boolean)

    if (!botToken || !chatIds?.length) {
      payload.logger.warn(
        'Telegram order notification skipped: bot token or chat ID is not configured',
      )
    } else {
      const itemsText = lines
        .map(
          (line) =>
            `• ${line.title}${line.options ? ` (${line.options})` : ''} × ${line.quantity} — ${line.price * line.quantity} ₴`,
        )
        .join('\n')

      const msg =
        `🔔 *НОВЕ ЗАМОВЛЕННЯ #${newOrder.id}*\n\n` +
        `👤 Клієнт: ${body.customerName}\n` +
        `📞 Тел: ${body.phone}\n` +
        `🚚 Доставка: ${body.deliveryCarrier === 'nova_poshta' ? 'Нова Пошта' : 'Укрпошта'}\n` +
        `🛍 Товари:\n${itemsText}\n` +
        `💰 Сума: ${totalAmount} ₴`

      const results = await Promise.allSettled(
        chatIds.map(async (chatId) => {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: 'Markdown',
            }),
          })

          if (!response.ok) {
            throw new Error(`Telegram returned HTTP ${response.status}`)
          }
        }),
      )

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          payload.logger.error(
            { err: result.reason, chatId: chatIds[index] },
            'Telegram order notification failed',
          )
        }
      })
    }

    let liqpayPayment
    if (body.paymentMethod === 'liqpay') {
      if (
        !siteSettings?.liqpayPublicKey ||
        !siteSettings.liqpayPrivateKey ||
        !siteSettings.siteURL
      ) {
        payload.logger.warn(
          { orderID: newOrder.id },
          'LiqPay payment skipped: keys or public site URL are not configured',
        )
      } else {
        try {
          const siteURL = new URL(siteSettings.siteURL)
          const isLocalHttp =
            siteURL.protocol === 'http:' &&
            (siteURL.hostname === 'localhost' || siteURL.hostname === '127.0.0.1')
          if (siteURL.protocol !== 'https:' && !isLocalHttp) {
            throw new Error('Public site URL must use HTTPS')
          }

          const origin = siteURL.origin
          liqpayPayment = generateLiqPayData({
            amount: totalAmount,
            description: `Замовлення #${newOrder.id}`,
            orderId: String(newOrder.id),
            publicKey: siteSettings.liqpayPublicKey,
            privateKey: siteSettings.liqpayPrivateKey,
            serverUrl: `${origin}/api/payments/liqpay/callback`,
            resultUrl: `${origin}/checkout?orderId=${encodeURIComponent(String(newOrder.id))}`,
          })
        } catch (error) {
          payload.logger.warn(
            { err: error, orderID: newOrder.id },
            'LiqPay payment skipped: public site URL is invalid',
          )
        }
      }
    }

    return NextResponse.json({ success: true, orderId: newOrder.id, liqpayPayment })
  } catch (error) {
    console.error(locale === 'ru' ? 'Ошибка создания заказа:' : 'Помилка створення замовлення:', error)
    return fail(messages.failedCreate, 500)
  }
}