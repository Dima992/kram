import { convertToUAH, getNBURates } from './getCurrencyRates'

export async function getFormattedPrice(basePrice: number, currency: 'UAH' | 'USD' | 'EUR' = 'UAH') {
  const rates = await getNBURates()
  const finalPriceUAH = convertToUAH(basePrice, currency, rates)

  return {
    priceUAH: finalPriceUAH,
    formatted: `${finalPriceUAH.toLocaleString('uk-UA')} ₴`,
  }
}