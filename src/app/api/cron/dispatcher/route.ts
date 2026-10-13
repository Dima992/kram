import { updateAllPrices } from '@/utilities/updateAllPrices'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getPayload } from 'payload'
import { GET as runSupplierImport } from '../supplier-import/route'
import { GET as runSupplierMapping } from '../supplier-mapping/route'

export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization')
  if (!secret || !authorization?.startsWith('Bearer ')) return false

  const supplied = authorization.slice('Bearer '.length)
  return (
    Buffer.byteLength(secret) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  )
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })
  const report: Record<string, unknown> = {}

  // Шаг 1: цены по курсу НБУ. Ошибка здесь не останавливает остальные шаги.
  try {
    report.prices = await updateAllPrices(payload)
  } catch (error) {
    report.prices = { error: error instanceof Error ? error.message : 'Помилка оновлення цін' }
  }

  // Шаг 2: импорт поставщика (существующее задание)
  const importResponse = await runSupplierImport(req)
  report.supplierImport = importResponse.status

  // Шаг 3: обработка очереди (существующее задание)
  const mappingResponse = await runSupplierMapping(req)
  report.supplierMapping = mappingResponse.status

  return NextResponse.json(report)
}