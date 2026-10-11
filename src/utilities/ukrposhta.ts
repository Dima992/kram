const UKRPOSHTA_API_URL = 'https://dev.ukrposhta.ua/ecom/0.0.1'

export interface UkrposhtaCity {
  id: string
  name: string
  region: string
}

export interface UkrposhtaOffice {
  postcode: string
  address: string
}

// Заглушка/метод поиска населенных пунктов Укрпошты
export async function searchUkrposhtaCities(query: string) {
  if (!query || query.length < 2) return []
  
  // Здесь будет логика работы с API Укрпошты (через их eCom API)
  return [
    { id: '1', name: 'м. Київ', region: 'Київська обл.' },
    { id: '2', name: 'м. Вінниця', region: 'Вінницька обл.' },
    { id: '3', name: 'м. Львів', region: 'Львівська обл.' },
  ]
}