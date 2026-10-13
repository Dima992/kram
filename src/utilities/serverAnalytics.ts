import type { SiteSetting } from '@/payload-types'
import { createHash } from 'crypto'
import type { Payload } from 'payload'

type ConversionItem = {
  id: string
  quantity: number
  price?: number
  title?: string
}

type ConversionEvent = {
  eventId: string
  name: 'AddToCart' | 'Purchase'
  value: number
  currency: string
  items: ConversionItem[]
  orderId?: string
  email?: string | null
  phone?: string | null
}

type RequestHeaders = Pick<Headers, 'get'>

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const getUserData = (event: ConversionEvent) => {
  const email = event.email?.trim().toLowerCase()
  const phone = event.phone?.replace(/\D/g, '')

  return {
    ...(email ? { email: sha256(email) } : {}),
    ...(phone ? { phone: sha256(phone) } : {}),
  }
}

const getRequestContext = (headers?: RequestHeaders) => {
  const ip =
    headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers?.get('x-real-ip') ||
    undefined
  const userAgent = headers?.get('user-agent') || undefined
  const pageURL = headers?.get('referer') || undefined

  return { ip, userAgent, pageURL }
}

async function sendGA4(
  payload: Payload,
  settings: SiteSetting,
  event: ConversionEvent,
) {
  if (!settings.ga4MeasurementId || !settings.ga4ApiSecret) {
    payload.logger.warn('GA4 conversion skipped: Measurement ID or API Secret is not configured')
    return
  }

  const params = new URLSearchParams({
    api_secret: settings.ga4ApiSecret,
    measurement_id: settings.ga4MeasurementId,
  })
  const response = await fetch(`https://www.google-analytics.com/mp/collect?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: `server.${event.orderId || event.eventId}`,
      events: [
        {
          name: event.name === 'Purchase' ? 'purchase' : 'add_to_cart',
          params: {
            currency: event.currency,
            value: event.value,
            ...(event.orderId ? { transaction_id: event.orderId } : {}),
            items: event.items.map((item) => ({
              item_id: item.id,
              ...(item.title ? { item_name: item.title } : {}),
              ...(typeof item.price === 'number' ? { price: item.price } : {}),
              quantity: item.quantity,
            })),
          },
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Google Analytics returned HTTP ${response.status}`)
  payload.logger.info({ event: event.name, orderID: event.orderId }, 'GA4 server conversion sent')
}

async function sendMeta(
  payload: Payload,
  settings: SiteSetting,
  event: ConversionEvent,
  headers?: RequestHeaders,
) {
  if (!settings.fbPixelId || !settings.fbCapiToken) {
    payload.logger.warn('Meta CAPI conversion skipped: Pixel ID or access token is not configured')
    return
  }

  const { ip, userAgent, pageURL } = getRequestContext(headers)
  const userData = getUserData(event)
  const response = await fetch(`https://graph.facebook.com/v24.0/${settings.fbPixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: settings.fbCapiToken,
      data: [
        {
          event_name: event.name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event.eventId,
          action_source: 'website',
          ...(pageURL ? { event_source_url: pageURL } : {}),
          user_data: {
            ...userData,
            ...(ip ? { client_ip_address: ip } : {}),
            ...(userAgent ? { client_user_agent: userAgent } : {}),
          },
          custom_data: {
            value: event.value,
            currency: event.currency,
            content_type: 'product',
            content_ids: event.items.map((item) => item.id),
            contents: event.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              ...(typeof item.price === 'number' ? { item_price: item.price } : {}),
            })),
            ...(event.orderId ? { order_id: event.orderId } : {}),
          },
        },
      ],
    }),
  })

  const result: { error?: { message?: string } } = await response.json()
  if (!response.ok || result.error) {
    throw new Error(
      result.error?.message
        ? `Meta CAPI returned HTTP ${response.status}: ${result.error.message}`
        : `Meta CAPI returned HTTP ${response.status}`,
    )
  }
  payload.logger.info({ event: event.name, orderID: event.orderId }, 'Meta CAPI conversion sent')
}

async function sendTikTok(
  payload: Payload,
  settings: SiteSetting,
  event: ConversionEvent,
  headers?: RequestHeaders,
) {
  if (!settings.tikTokPixelId || !settings.tikTokEventsApiToken) {
    payload.logger.warn(
      'TikTok Events API conversion skipped: Pixel ID or Events API token is not configured',
    )
    return
  }

  const tiktokEventName = event.name === 'Purchase' ? 'CompletePayment' : 'AddToCart'
  const { ip, userAgent, pageURL } = getRequestContext(headers)
  const userData = getUserData(event)
  const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Access-Token': settings.tikTokEventsApiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pixel_code: settings.tikTokPixelId,
      event: tiktokEventName,
      event_id: event.eventId,
      timestamp: new Date().toISOString(),
      context: {
        ...(ip || userAgent || userData.phone || userData.email
          ? {
              user: {
                ...(userData.phone ? { phone_number: userData.phone } : {}),
                ...(userData.email ? { email: userData.email } : {}),
              },
              ...(ip ? { ip } : {}),
              ...(userAgent ? { user_agent: userAgent } : {}),
            }
          : {}),
        ...(pageURL ? { page: { url: pageURL } } : {}),
      },
      properties: {
        value: event.value,
        currency: event.currency,
        content_type: 'product',
        contents: event.items.map((item) => ({
          content_id: item.id,
          content_name: item.title,
          quantity: item.quantity,
          ...(typeof item.price === 'number' ? { price: item.price } : {}),
        })),
        ...(event.orderId ? { order_id: event.orderId } : {}),
      },
    }),
  })

  const result: { code?: number; message?: string } = await response.json()
  if (!response.ok || (typeof result.code === 'number' && result.code !== 0)) {
    throw new Error(
      result.message
        ? `TikTok Events API returned HTTP ${response.status}: ${result.message}`
        : `TikTok Events API returned HTTP ${response.status}`,
    )
  }
  payload.logger.info(
    { event: event.name, orderID: event.orderId },
    'TikTok Events API conversion sent',
  )
}

export async function sendServerConversion(
  payload: Payload,
  event: ConversionEvent,
  headers?: RequestHeaders,
) {
  if (!Number.isFinite(event.value) || event.value < 0) {
    payload.logger.error({ event: event.name }, 'Conversion skipped: invalid event value')
    return
  }

  let settings: SiteSetting
  try {
    settings = await payload.findGlobal({
      slug: 'site-settings',
      overrideAccess: true,
    })
  } catch (error) {
    payload.logger.error({ err: error }, 'Could not load Site Settings for server analytics')
    return
  }

  await Promise.all([
    sendGA4(payload, settings, event).catch((error: unknown) => {
      payload.logger.error({ err: error, event: event.name }, 'Failed to send GA4 conversion')
    }),
    sendMeta(payload, settings, event, headers).catch((error: unknown) => {
      payload.logger.error({ err: error, event: event.name }, 'Failed to send Meta CAPI conversion')
    }),
    sendTikTok(payload, settings, event, headers).catch((error: unknown) => {
      payload.logger.error(
        { err: error, event: event.name },
        'Failed to send TikTok Events API conversion',
      )
    }),
  ])
}