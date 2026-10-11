import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { processSupplierImportJobs } from '@/utilities/supplierImportQueue'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 })
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return NextResponse.json({ error: 'Недостатньо прав для обробки імпорту.' }, { status: 403 })
  }

  try {
    const result = await processSupplierImportJobs(payload, { jobLimit: 1, batchSize: 5 })
    return NextResponse.json(result)
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Не вдалося обробити пакет імпорту постачальника' })
    return NextResponse.json({ error: 'Не вдалося обробити пакет імпорту.' }, { status: 500 })
  }
}
