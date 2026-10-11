import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { downloadSupplierFile } from '@/utilities/downloadSupplierFile'
import { parseSupplierFile, type SupplierRow } from '@/utilities/parseSupplierFile'
import {
  enqueueSupplierRows,
  enqueueTelegramPosts,
  markMissingTelegramProductsUnavailable,
} from '@/utilities/supplierImportQueue'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

async function requireAdmin(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return { payload, response: NextResponse.json({ error: 'Потрібно увійти в адмін-панель.' }, { status: 401 }) }
  if (user.collection !== 'users' || !checkRole(['admin'], user)) {
    return {
      payload,
      response: NextResponse.json({ error: 'Недостатньо прав для імпорту товарів.' }, { status: 403 }),
    }
  }
  return { payload, response: null }
}

function isTelegramPost(value: unknown): value is {
  messageId: string | number
  date: string
  text: string
  [key: string]: unknown
} {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'messageId' in value &&
      (typeof value.messageId === 'string' || typeof value.messageId === 'number') &&
      'date' in value &&
      typeof value.date === 'string' &&
      'text' in value &&
      typeof value.text === 'string',
  )
}

export async function POST(req: Request) {
  const { payload, response } = await requireAdmin(req)
  if (response) return response

  try {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body: unknown = await req.json()
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Некоректні дані Telegram-імпорту.' }, { status: 400 })
      }
      const input = body as {
        sourceID?: unknown
        channel?: unknown
        since?: unknown
        posts?: unknown
        removedMessageIDs?: unknown
      }
      if (typeof input.sourceID !== 'string' || !input.sourceID) {
        return NextResponse.json({ error: 'Виберіть профіль постачальника.' }, { status: 400 })
      }
      if (typeof input.channel !== 'string' || !input.channel.trim()) {
        return NextResponse.json({ error: 'Вкажіть Telegram-канал.' }, { status: 400 })
      }
      if (!Array.isArray(input.posts) || !input.posts.every(isTelegramPost)) {
        return NextResponse.json(
          { error: 'posts має бути масивом повідомлень із messageId, date і text.' },
          { status: 400 },
        )
      }
      if (
        input.posts.length > 5000 ||
        input.posts.some((post) => post.text.length > 20_000)
      ) {
        return NextResponse.json(
          { error: 'Дозволено не більше 5 000 Telegram-повідомлень і 20 000 символів на кожне.' },
          { status: 413 },
        )
      }
      if (
        input.removedMessageIDs !== undefined &&
        (!Array.isArray(input.removedMessageIDs) ||
          !input.removedMessageIDs.every((id) => typeof id === 'string' || typeof id === 'number'))
      ) {
        return NextResponse.json({ error: 'removedMessageIDs має бути масивом ID повідомлень.' }, { status: 400 })
      }

      const source = await payload.findByID({
        collection: 'import-sources',
        id: input.sourceID,
        depth: 0,
        overrideAccess: true,
      })
      const queued = await enqueueTelegramPosts(payload, {
        supplierID: source.id,
        channel: input.channel,
        posts: input.posts,
        since: typeof input.since === 'string' ? input.since : undefined,
      })
      const unavailable = await markMissingTelegramProductsUnavailable(
        payload,
        source.id,
        input.channel,
        (input.removedMessageIDs as Array<string | number> | undefined)?.map(String) || [],
      )
      return NextResponse.json({ ...queued, unavailable })
    }

    const formData = await req.formData()
    const sourceID = formData.get('sourceID')
    const file = formData.get('file')
    const url = formData.get('url')
    if (typeof sourceID !== 'string' || !sourceID) {
      return NextResponse.json({ error: 'Виберіть профіль постачальника.' }, { status: 400 })
    }
    if (file !== null && !(file instanceof File)) {
      return NextResponse.json({ error: 'Поле file має бути файлом.' }, { status: 400 })
    }
    if (url !== null && typeof url !== 'string') {
      return NextResponse.json({ error: 'Поле url має бути текстовим посиланням.' }, { status: 400 })
    }
    if (typeof url === 'string' && url.length > 2048) {
      return NextResponse.json({ error: 'Посилання на прайс не може бути довшим за 2 048 символів.' }, { status: 400 })
    }
    if (file instanceof File && typeof url === 'string' && url.trim()) {
      return NextResponse.json({ error: 'Завантажте файл або вкажіть посилання, але не обидва варіанти.' }, { status: 400 })
    }
    if (file instanceof File && (file.size === 0 || file.size > 4 * 1024 * 1024)) {
      return NextResponse.json({ error: 'Розмір файлу має бути від 1 байта до 4 МБ.' }, { status: 400 })
    }

    const source = await payload.findByID({
      collection: 'import-sources',
      id: sourceID,
      depth: 0,
      overrideAccess: true,
    })
    const sourceType = file instanceof File ? 'file' : 'url'
    const fileData =
      file instanceof File
        ? { fileName: file.name, buffer: Buffer.from(await file.arrayBuffer()) }
        : await downloadSupplierFile(source, { url: typeof url === 'string' ? url : undefined })
    const rows: SupplierRow[] = await parseSupplierFile(
      fileData.fileName,
      fileData.buffer,
      source.delimiter,
      source.encoding,
    )
    const queued = await enqueueSupplierRows(payload, {
      supplierID: source.id,
      sourceType,
      rows,
    })
    return NextResponse.json(queued, { status: 202 })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Не вдалося поставити імпорт на модерацію' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не вдалося поставити імпорт у чергу.' },
      { status: 400 },
    )
  }
}
