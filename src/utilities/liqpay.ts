import crypto from 'crypto'

interface LiqPayPaymentData {
  amount: number
  currency?: string
  description: string
  orderId: string
  publicKey: string
  privateKey: string
  serverUrl: string
  resultUrl: string
}

export function generateLiqPayData({
  amount,
  currency = 'UAH',
  description,
  orderId,
  publicKey,
  privateKey,
  serverUrl,
  resultUrl,
}: LiqPayPaymentData) {
  if (!publicKey || !privateKey) {
    throw new Error('LiqPay public and private keys are required')
  }

  const jsonParams = {
    public_key: publicKey,
    version: '3',
    action: 'pay',
    amount: amount,
    currency: currency,
    description: description,
    order_id: orderId,
    server_url: serverUrl,
    result_url: resultUrl,
  }

  // 1. Преобразуем параметры в JSON и кодируем в Base64
  const data = Buffer.from(JSON.stringify(jsonParams)).toString('base64')

  // 2. Генерируем подпись: sha1(private_key + data + private_key)
  const signString = privateKey + data + privateKey
  const signature = crypto.createHash('sha1').update(signString).digest('base64')

  return {
    data,
    signature,
    checkoutUrl: 'https://www.liqpay.ua/api/3/checkout',
  }
}
