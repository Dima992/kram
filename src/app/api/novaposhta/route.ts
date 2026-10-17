import { getWarehouses, searchCities } from '@/utilities/novaposhta'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'cities') {
    const q = searchParams.get('q') ?? ''
    return NextResponse.json({ items: await searchCities(q) })
  }

  if (action === 'warehouses') {
    const ref = searchParams.get('ref') ?? ''
    return NextResponse.json({ items: await getWarehouses(ref) })
  }

  return NextResponse.json({ items: [] }, { status: 400 })
}