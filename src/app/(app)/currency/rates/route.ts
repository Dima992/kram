import { getNBURates } from '@/lib/nbu'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rates = await getNBURates()
    return NextResponse.json({ success: true, rates })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch rates' }, { status: 500 })
  }
}