import { getOffices, searchCities, UkrposhtaError } from '@/utilities/ukrposhta'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    if (action === 'cities') {
      const q = searchParams.get('q') ?? ''
      return NextResponse.json({ items: await searchCities(q) })
    }

    if (action === 'offices') {
      const cityId = searchParams.get('cityId') ?? ''
      const regionId = searchParams.get('regionId') ?? ''
      return NextResponse.json({ items: await getOffices(cityId, regionId) })
    }

    return NextResponse.json({ items: [] }, { status: 400 })
  } catch (error) {
    console.error('Ошибка маршрута Укрпошты:', error)
    const message = error instanceof UkrposhtaError ? error.message : 'Ukrposhta unavailable'
    return NextResponse.json({ items: [], error: message }, { status: 502 })
  }
}