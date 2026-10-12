'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getServerSideURL } from '@/utilities/getURL'

type SendOrderAccessEmailArgs = {
  email: string
  orderID: string
  locale?: 'uk' | 'ru'
}

type SendOrderAccessEmailResult = {
  success: boolean
  error?: string
}

export async function sendOrderAccessEmail({
  email,
  orderID,
  locale = 'uk',
}: SendOrderAccessEmailArgs): Promise<SendOrderAccessEmailResult> {
  const payload = await getPayload({ config: configPromise })

  try {
    const { docs: orders } = await payload.find({
      collection: 'orders',
      where: {
        and: [{ id: { equals: orderID } }, { customerEmail: { equals: email } }],
      },
      limit: 1,
      depth: 0,
    })

    const order = orders[0]

    if (!order || !order.accessToken) {
      return { success: true }
    }

    const serverURL = getServerSideURL()
    const orderURL = `${serverURL}/orders/${order.id}?email=${encodeURIComponent(email)}&accessToken=${order.accessToken}`

    const text = {
      uk: {
        heading: 'Перегляньте своє замовлення',
        intro: 'Натисніть посилання нижче, щоб переглянути деталі вашого замовлення:',
        action: `Переглянути замовлення #${order.id}`,
        fallback: 'Або скопіюйте та вставте це посилання у ваш браузер:',
        note: 'Це посилання надасть вам доступ до перегляду деталей замовлення.',
        subject: `Доступ до вашого замовлення #${order.id}`,
      },
      ru: {
        heading: 'Посмотрите ваш заказ',
        intro: 'Нажмите ссылку ниже, чтобы просмотреть детали вашего заказа:',
        action: `Посмотреть заказ #${order.id}`,
        fallback: 'Или скопируйте и вставьте эту ссылку в браузер:',
        note: 'Эта ссылка даст вам доступ к просмотру деталей заказа.',
        subject: `Доступ к вашему заказу #${order.id}`,
      },
    }[locale]

    const emailBody = `
        <h1>${text.heading}</h1>
        <p>${text.intro}</p>
        <p><a href="${orderURL}">${text.action}</a></p>
        <p>${text.fallback}</p>
        <p>${orderURL}</p>
        <p>${text.note}</p>
      `

    console.log('[sendOrderAccessEmail] Email body:', emailBody)

    await payload.sendEmail({
      to: email,
      subject: text.subject,
      html: emailBody,
    })

    return { success: true }
  } catch (err) {
    payload.logger.error({ msg: 'Failed to send order access email', err })
    return { success: true }
  }
}
