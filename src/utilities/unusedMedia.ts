import type { Payload } from 'payload'

// Файлы моложе этого срока не показываем и не удаляем
export const UNUSED_MIN_AGE_DAYS = 1
// Максимум файлов за один раз
export const MAX_DELETE_PER_RUN = 200

// Так выглядит ID записи в базе (24 символа, 0-9 и a-f)
const ID_PATTERN = /[a-f0-9]{24}/g

export type UnusedMediaRow = {
  id: string
  filename: string | null
  filesize: number | null
  createdAt: string
  thumbUrl: string | null
}

// Все записи коллекции, постранично, на всех языках и включая черновики
async function allDocs(payload: Payload, collection: string): Promise<any[]> {
  const out: any[] = []
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection: collection as any,
      depth: 0,
      draft: true,
      limit: 500,
      page,
      locale: 'all',
      overrideAccess: true,
    })
    out.push(...res.docs)
    if (!res.hasNextPage) break
    page++
  }
  return out
}

// Собираем все ID, которые встречаются в документах сайта
async function collectUsedIds(payload: Payload): Promise<Set<string>> {
  const used = new Set<string>()

  const scan = (value: unknown) => {
    const text = JSON.stringify(value) ?? ''
    for (const id of text.match(ID_PATTERN) ?? []) used.add(id)
  }

  for (const collection of payload.config.collections) {
    if (collection.slug === 'media') continue
    for (const doc of await allDocs(payload, collection.slug)) scan(doc)
  }

  for (const global of payload.config.globals) {
    const doc = await payload.findGlobal({
      slug: global.slug as any,
      depth: 0,
      draft: true,
      locale: 'all',
      overrideAccess: true,
    })
    scan(doc)
  }

  return used
}

// Список файлов, которые нигде не используются и достаточно старые
export async function listUnusedMedia(payload: Payload): Promise<UnusedMediaRow[]> {
  const used = await collectUsedIds(payload)
  const cutoff = Date.now() - UNUSED_MIN_AGE_DAYS * 24 * 60 * 60 * 1000
  const media = await allDocs(payload, 'media')

  return media
    .filter((m) => !used.has(String(m.id)) && new Date(m.createdAt).getTime() < cutoff)
    .map((m) => ({
      id: String(m.id),
      filename: m.filename ?? null,
      filesize: typeof m.filesize === 'number' ? m.filesize : null,
      createdAt: m.createdAt,
      thumbUrl: m.sizes?.thumbnail?.url ?? m.url ?? null,
    }))
}

// Удаляем только то, что сейчас точно никем не используется
export async function deleteUnusedMedia(payload: Payload, req: any, ids: string[]) {
  const wanted = [...new Set(ids)].slice(0, MAX_DELETE_PER_RUN)

  // Проверяем заново прямо перед удалением
  const freshUnused = new Set((await listUnusedMedia(payload)).map((m) => m.id))

  const report = {
    deleted: [] as string[],
    skipped: [] as string[],
    failed: [] as { id: string; error: string }[],
  }

  for (const id of wanted) {
    if (!freshUnused.has(id)) {
      report.skipped.push(id)
      continue
    }
    try {
      await payload.delete({ collection: 'media', id, overrideAccess: true, req })
      report.deleted.push(id)
    } catch (err) {
      report.failed.push({ id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return report
}