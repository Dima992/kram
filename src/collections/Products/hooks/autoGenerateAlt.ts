import type { CollectionAfterChangeHook } from 'payload'

// Языки, для которых заполняем описания фото
const LOCALES = ['uk', 'ru'] as const

// Подпись фото: «головне фото», «фото 2» (uk) или «главное фото», «фото 2» (ru)
const photoLabel = (index: number, locale: 'uk' | 'ru') => {
  if (locale === 'ru') return index === 0 ? 'главное фото' : `фото ${index + 1}`
  return index === 0 ? 'головне фото' : `фото ${index + 1}`
}

// Считаем alt «пустым», если поле пустое или в нём стоит имя файла
const isPlaceholderAlt = (alt: string | null | undefined, filename: string | null | undefined) => {
  const value = (alt || '').trim()
  if (value === '') return true
  if (!filename) return false
  const base = filename.replace(/\.[^.]+$/, '')
  return value === filename || value === base
}

// Заполняет alt у всех фото товара на украинском и русском.
// Работает ПОСЛЕ сохранения товара, чтобы взять уже записанное название.
// Вписанные вручную описания не трогаем.
export const autoGenerateAlt: CollectionAfterChangeHook = async ({ doc, req }) => {
  const gallery = Array.isArray(doc.gallery) ? doc.gallery : []
  if (gallery.length === 0) return doc

  for (const locale of LOCALES) {
    try {
      // Название товара на этом языке
      const product = await req.payload.findByID({
        collection: 'products',
        id: doc.id,
        locale,
        depth: 0,
        draft: true,
        req,
      })
      const title = product.title || 'Товар'

      for (let index = 0; index < gallery.length; index++) {
        const item = gallery[index]
        const imageId = typeof item?.image === 'object' ? item.image?.id : item?.image
        if (!imageId) continue

        // fallbackLocale: false — иначе русский alt «подтянет» украинский и не заполнится
        const media = await req.payload.findByID({
          collection: 'media',
          id: imageId,
          locale,
          depth: 0,
          fallbackLocale: false,
          req,
        })

        if (!isPlaceholderAlt(media.alt, media.filename)) continue

        await req.payload.update({
          collection: 'media',
          id: imageId,
          locale,
          data: { alt: `${title} — ${photoLabel(index, locale)}` },
          req,
        })
      }
    } catch (err) {
      // Ошибка в логах сервера, но сохранение товара не блокируем
      req.payload.logger.error({ err }, `Auto alt skipped for locale ${locale}`)
    }
  }

  return doc
}