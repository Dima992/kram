import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

type Global = keyof Config['globals']
type Locale = 'uk' | 'ru'

async function getGlobal<T extends Global>(slug: T, depth = 0, locale: Locale = 'uk') {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    locale,
  })

  return global
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug.
 * Pass locale ('uk' or 'ru') so the texts come in the right language.
 * Cache key includes the locale, so each language has its own cached copy.
 */
export const getCachedGlobal = <T extends Global>(slug: T, depth = 0, locale: Locale = 'uk') =>
  unstable_cache(async () => getGlobal<T>(slug, depth, locale), [slug, locale], {
    revalidate: 3600,
    tags: [`global_${slug}`],
  })