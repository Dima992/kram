import configPromise from '@payload-config'
import { downloadSupplierFile } from '@/utilities/downloadSupplierFile'
import {
  invokeSupplierImport,
  supplierImportMessage,
  supplierImportSucceeded,
} from '@/utilities/invokeSupplierImport'
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
    const { docs: sources } = await payload.find({
      collection: 'import-sources',
      limit: 100,
      pagination: false,
      overrideAccess: true,
      where: {
        and: [
          { autoImportEnabled: { equals: true } },
          { supplierFeedURL: { exists: true } },
        ],
      },
    })

    const results: { source: string; status: string; message: string }[] = []

    for (const source of sources) {
      await payload.update({
        collection: 'import-sources',
        id: source.id,
        overrideAccess: true,
        data: {
          lastImportAt: new Date().toISOString(),
          lastImportStatus: 'running',
          lastImportMessage: 'Автоматичне завантаження прайсу виконується.',
        },
      })

      try {
        const { buffer, fileName } = await downloadSupplierFile(source)
        const importResponse = await invokeSupplierImport(
          source.id,
          fileName,
          buffer,
          new Headers({ 'x-supplier-import-secret': process.env.CRON_SECRET || '' }),
        )
        const result: unknown = await importResponse.json()
        const success = supplierImportSucceeded(importResponse.ok, result)
        const message = supplierImportMessage(source, result)

        await payload.update({
          collection: 'import-sources',
          id: source.id,
          overrideAccess: true,
          data: {
            lastImportStatus: success ? 'success' : 'error',
            lastImportMessage: message,
          },
        })
        results.push({
          source: source.name,
          status: success ? 'success' : 'error',
          message,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Помилка автоматичного імпорту.'
        payload.logger.error({
          err: error,
          msg: `Автоматичний імпорт постачальника ${source.name} не вдався`,
        })
        await payload.update({
          collection: 'import-sources',
          id: source.id,
          overrideAccess: true,
          data: {
            lastImportStatus: 'error',
            lastImportMessage: message.slice(0, 1000),
          },
        })
        results.push({ source: source.name, status: 'error', message })
      }
    }

    const failed = results.filter((result) => result.status === 'error').length
    return NextResponse.json(
      { processed: results.length, failed, results },
      { status: failed > 0 ? 207 : 200 },
    )
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Помилка запуску автоматичного імпорту' })
    return NextResponse.json(
      { error: 'Не вдалося запустити автоматичний імпорт.' },
      { status: 500 },
    )
  }
}
