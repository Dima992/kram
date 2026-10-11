import configPromise from '@payload-config'
import { processSupplierImportJobs } from '@/utilities/supplierImportQueue'
import { timingSafeEqual } from 'node:crypto'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

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
  try {
    const result = await processSupplierImportJobs(payload, { jobLimit: 1, batchSize: 5 })
    return NextResponse.json(result)
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Cron не зміг обробити чергу маппінгу постачальників' })
    return NextResponse.json({ error: 'Не вдалося обробити чергу маппінгу.' }, { status: 500 })
  }
}
