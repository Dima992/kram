import type { CollectionBeforeChangeHook } from 'payload'

export const autoGenerateAlt: CollectionBeforeChangeHook = async ({ data, req }) => {
  // Если галерея пустая — ничего не делаем и не тормозим сохранение
  if (!data?.gallery || !Array.isArray(data.gallery) || data.gallery.length === 0) {
    return data
  }

  const currentLocale = req.locale === 'ru' ? 'ru' : 'uk'
  const productTitle = data.title || (currentLocale === 'ru' ? 'Товар' : 'Товар')

  for (let index = 0; index < data.gallery.length; index++) {
    const item = data.gallery[index]
    if (!item?.image) continue

    const imageId = typeof item.image === 'object' ? item.image.id : item.image

    // Формируем текст на текущем языке запроса (uk или ru)
    const photoLabel =
      index === 0
        ? currentLocale === 'ru'
          ? 'главное фото'
          : 'головне фото'
        : currentLocale === 'ru'
          ? `фото ${index + 1}`
          : `фото ${index + 1}`

    const generatedAlt = `${productTitle} — ${photoLabel}`

    try {
      // Ищем медиафайл на текущем языке
      const mediaDoc = await req.payload.findByID({
        collection: 'media',
        id: imageId,
        locale: currentLocale,
      })

      // Если alt не заполнен вручную — автоматически обновляем его для этой локали
      if (mediaDoc && !mediaDoc.alt) {
        await req.payload.update({
          collection: 'media',
          id: imageId,
          locale: currentLocale,
          data: {
            alt: generatedAlt,
          },
        })
      }
    } catch (err) {
      // Логируем ошибку в консоль сервера, но НЕ блокируем сохранение товара!
      console.error(`[AutoAlt] Не удалось обновить alt для media ID ${imageId}:`, err)
    }
  }

  return data
}
