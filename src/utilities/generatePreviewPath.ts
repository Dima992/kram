import type { PayloadRequest } from 'payload'

const collectionPrefixMap: Record<'pages' | 'products', string> = {
  pages: '',
  products: '/products',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = async ({ collection, slug, req }: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const encodedSlug = encodeURIComponent(slug)
  const { previewSecret } = await req.payload.findGlobal({
    slug: 'site-settings',
    overrideAccess: true,
  })

  if (!previewSecret) {
    req.payload.logger.warn('Preview URL generation skipped: preview secret is not configured')
    return null
  }

  const encodedParams = new URLSearchParams({
    path: `${collectionPrefixMap[collection]}/${encodedSlug}`,
    previewSecret,
  })

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
