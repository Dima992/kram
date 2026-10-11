import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Page } from '../../../payload-types'

const getPathsToRevalidate = (slug?: string | null): string[] => {
  const baseSlug = slug === 'home' ? '' : slug || ''

  const paths = ['/', '/ru']

  if (baseSlug !== '') paths.push(`/${baseSlug}`, `/ru/${baseSlug}`)

  return paths
}

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    revalidateTag('pages', { expire: 0 })

    if (doc._status === 'published') {
      const paths = getPathsToRevalidate(doc.slug)

      paths.forEach((path) => {
        payload.logger.info(`Revalidating page at path: ${path}`)
        revalidatePath(path)
      })
    }

    // Если страница снята с публикации, инвалидируем старые языковые пути
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPaths = getPathsToRevalidate(previousDoc.slug)

      oldPaths.forEach((oldPath) => {
        payload.logger.info(`Revalidating old page at path: ${oldPath}`)
        revalidatePath(oldPath)
      })
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateTag('pages', { expire: 0 })

    const paths = getPathsToRevalidate(doc?.slug)

    paths.forEach((path) => {
      revalidatePath(path)
    })
  }

  return doc
}