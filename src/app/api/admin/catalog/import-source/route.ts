import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { downloadSupplierFile } from '@/utilities/downloadSupplierFile'
import {
  invokeSupplierImport,
  supplierImportMessage,
  supplierImportSucceeded,
} from '@/utilities/invokeSupplierImport'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 })
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return NextResponse.json({ error: 'Недостатньо прав для імпорту товарів.' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as { sourceID?: unknown }
    if (typeof body.sourceID !== 'string' || !body.sourceID) {
      return NextResponse.json({ error: 'Виберіть профіль постачальника.' }, { status: 400 })
    }

    const source = await payload.findByID({
      collection: 'import-sources',
      id: body.sourceID,
      overrideAccess: true,
    })
    const { buffer, fileName } = await downloadSupplierFile(source)
    const importResponse = await invokeSupplierImport(
      source.id,
      fileName,
      buffer,
      req.headers,
    )
    const result: unknown = await importResponse.json()
    const success = supplierImportSucceeded(importResponse.ok, result)

    await payload.update({
      collection: 'import-sources',
      id: source.id,
      overrideAccess: true,
      data: {
        lastImportAt: new Date().toISOString(),
        lastImportStatus: success ? 'success' : 'error',
        lastImportMessage: supplierImportMessage(source, result),
      },
    })

    return NextResponse.json(result, { status: importResponse.status })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Ручне завантаження прайсу постачальника не вдалося' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося завантажити прайс.' },
      { status: 400 },
    )
  }
}
