import { Media } from '@/components/Media'
import { Price } from '@/components/Price'
import type { Media as MediaType, Product, Variant } from '@/payload-types'
import Link from 'next/link'

type Props = {
  product: Product
  style?: 'compact' | 'default'
  variant?: Variant
  quantity?: number
  currencyCode?: string
}

export const ProductItem: React.FC<Props> = ({
  product,
  style = 'default',
  quantity,
  variant,
  currencyCode,
}) => {
  const { title } = product

  const metaImage: MediaType | undefined =
    product.meta?.image && typeof product.meta.image === 'object' ? product.meta.image : undefined

  const firstGalleryImage: MediaType | undefined =
    product.gallery?.[0]?.image && typeof product.gallery[0].image === 'object'
      ? product.gallery[0].image
      : undefined

  let image: MediaType | undefined = firstGalleryImage || metaImage

  const isVariant = Boolean(variant) && typeof variant === 'object'

  if (isVariant) {
    const imageVariant = product.gallery?.find((item) => {
      if (!item.variantOption) return false
      const variantOptionID =
        typeof item.variantOption === 'object' ? item.variantOption.id : item.variantOption

      const hasMatch = variant?.options?.some((option) => {
        if (typeof option === 'object') return option.id === variantOptionID
        else return option === variantOptionID
      })

      return hasMatch
    })

    if (imageVariant?.image && typeof imageVariant.image === 'object') {
      image = imageVariant.image
    }
  }

  const itemPrice =
    typeof variant?.priceInUAH === 'number' && variant.priceInUAH > 0
      ? variant.priceInUAH
      : product.priceInUAH
  const itemURL = `/products/${product.slug}${variant ? `?variant=${variant.id}` : ''}`

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-stretch justify-stretch h-20 w-20 p-2 rounded-lg border">
        <div className="relative w-full h-full">
          {image && (
            <Media className="" fill imgClassName="rounded-lg object-cover" resource={image} />
          )}
        </div>
      </div>
      <div className="flex grow justify-between items-center">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-lg">
            <Link href={itemURL}>{title}</Link>
          </p>
          {variant && (
            <p className="text-sm font-mono text-primary/50 tracking-widest">
              {variant.options
                ?.map((option) => {
                  if (typeof option === 'object') return option.label
                  return null
                })
                .join(', ')}
            </p>
          )}
          <div>
            {'x'}
            {quantity}
          </div>
        </div>

        {itemPrice && quantity && (
          <div className="text-right">
            <p className="font-medium text-lg">Subtotal</p>
            <Price
              className="font-mono text-primary/50 text-sm"
              amount={itemPrice * quantity}
              currencyCode={currencyCode}
            />
          </div>
        )}
      </div>
    </div>
  )
}