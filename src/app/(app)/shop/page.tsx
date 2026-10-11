import { Grid } from '@/components/Grid'
import { ProductGridItem } from '@/components/ProductGridItem'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import React from 'react'

export const revalidate = 3600

export const metadata = {
  description: 'Search for products in the store.',
  title: 'Shop',
}

type SearchParams = { [key: string]: string | string[] | undefined }

type Props = {
  searchParams: Promise<SearchParams>
}

const getShopProducts = unstable_cache(
  async (
    searchValue: SearchParams['q'],
    sort: SearchParams['sort'],
    category: SearchParams['category'],
  ) => {
    const payload = await getPayload({ config: configPromise })

    return payload.find({
      collection: 'products',
      draft: false,
      overrideAccess: false,
      select: {
        title: true,
        slug: true,
        gallery: true,
        categories: true,
        baseCurrency: true,
        basePrice: true,
        priceInUAH: true,
      },
      ...(sort ? { sort } : { sort: 'title' }),
      ...(searchValue || category
        ? {
            where: {
              and: [
                {
                  _status: {
                    equals: 'published',
                  },
                },
                ...(searchValue
                  ? [
                      {
                        or: [
                          {
                            title: {
                              like: searchValue,
                            },
                          },
                          {
                            description: {
                              like: searchValue,
                            },
                          },
                        ],
                      },
                    ]
                  : []),
                ...(category
                  ? [
                      {
                        categories: {
                          contains: category,
                        },
                      },
                    ]
                  : []),
              ],
            },
          }
        : {}),
    })
  },
  ['shop-products'],
  { revalidate: 3600, tags: ['products'] },
)

export default async function ShopPage({ searchParams }: Props) {
  const { q: searchValue, sort, category } = await searchParams
  const requestHeaders = await headers()
  const locale = requestHeaders.get('x-locale') === 'ru' ? 'ru' : 'uk'

  const products = await getShopProducts(searchValue, sort, category)

  const resultsText = products.docs.length > 1 ? 'results' : 'result'

  return (
    <div>
      {searchValue ? (
        <p className="mb-4">
          {products.docs?.length === 0
            ? 'There are no products that match '
            : `Showing ${products.docs.length} ${resultsText} for `}
          <span className="font-bold">&quot;{searchValue}&quot;</span>
        </p>
      ) : null}

      {!searchValue && products.docs?.length === 0 && (
        <p className="mb-4">No products found. Please try different filters.</p>
      )}

      {products?.docs.length > 0 ? (
        <Grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.docs.map((product, index) => {
            return (
              <ProductGridItem
                key={product.id}
                locale={locale}
                priority={index === 0}
                product={product}
              />
            )
          })}
        </Grid>
      ) : null}
    </div>
  )
}
