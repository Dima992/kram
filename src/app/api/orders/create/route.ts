import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { generateLiqPayData } from '@/utilities/liqpay'

type RequestedItem = {
  productId: string
  quantity: number
}

const orderMessages = {
  uk: {
    invalidOrder: 'Некоректні товари або спосіб оплати.',
    unavailableProducts: 'Один або декілька товарів недоступні для покупки.',
    invalidAmount: 'Сума замовлення недійсна.',
    failedCreate: 'Не вдалося створити замовлення.',
    genericError: 'Сталася помилка при створенні замовлення.',
  },
  ru: {
    invalidOrder: 'Некорректные товары или способ оплаты.',
    unavailableProducts: 'Один или несколько товаров недоступны для покупки.',
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
  return (
    typeof item === 'object' &&
    item !== null &&
    'productId' in item &&
    typeof item.productId === 'string' &&
    'quantity' in item &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 99
  )
}

export async function POST(req: Request) {
  const locale = getOrderLocale(req)
  const messages = orderMessages[locale]

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
      return NextResponse.json({ success: false, error: messages.invalidOrder }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    const requestedItems = body.items as RequestedItem[]
    const productIDs = [...new Set(requestedItems.map(({ productId }) => productId))]
    const { docs: products } = await payload.find({
      collection: 'products',
      depth: 0,
      limit: productIDs.length,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [{ id: { in: productIDs } }, { _status: { equals: 'published' } }],
      },
    })
    const productsByID = new Map(products.map((product) => [String(product.id), product]))

    const orderItems = requestedItems.map(({ productId, quantity }) => {
      const product = productsByID.get(productId)
      const price = product?.priceInUAH

      if (!product || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        return null
      }

      return {
        product: product.id,
        quantity,
      }
    })

    if (orderItems.some((item) => item === null)) {
      return NextResponse.json({ success: false, error: messages.unavailableProducts }, { status: 400 })
    }

    const validatedOrderItems = orderItems.filter((item) => item !== null)
    const totalAmount = validatedOrderItems.reduce((total, item) => {
      const product = productsByID.get(String(item.product))
      return total + (product?.priceInUAH || 0) * item.quantity
    }, 0)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ success: false, error: messages.invalidAmount }, { status: 400 })
    }

    // Создаем новый заказ в базе данных со статусом 'new'
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
        items: validatedOrderItems,
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
      const msg =
        `🔔 *НОВЕ ЗАМОВЛЕННЯ #${newOrder.id}*\n\n` +
        `👤 Клієнт: ${body.customerName}\n` +
        `📞 Тел: ${body.phone}\n` +
        `🚚 Доставка: ${body.deliveryCarrier === 'nova_poshta' ? 'Нова Пошта' : 'Укрпошта'}\n` +
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
    return NextResponse.json({ success: false, error: messages.failedCreate }, { status: 500 })
  }
}
