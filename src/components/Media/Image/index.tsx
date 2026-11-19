'use client'

import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/cn'
import NextImage from 'next/image'
import React from 'react'

import type { Props as MediaProps } from '../types'

import { cssVariables } from '@/cssVariables'

const { breakpoints } = cssVariables

// Размер копии из медиатеки, которую нужно взять (если она есть).
// По умолчанию — оригинал, как работало раньше
type ImageSize = 'large' | 'thumbnail' | 'square'

type ExtendedProps = MediaProps & { imageSize?: ImageSize }

export const Image: React.FC<ExtendedProps> = (props) => {
  const {
    alt: altFromProps,
    fill,
    height: heightFromProps,
    imageSize,
    imgClassName,
    onClick,
    onLoad: onLoadFromProps,
    priority,
    resource,
    size: sizeFromProps,
    src: srcFromProps,
    width: widthFromProps,
  } = props

  const [isLoading, setIsLoading] = React.useState(true)

  let width: number | undefined | null
  let height: number | undefined | null
  let alt = altFromProps
  let src: StaticImageData | string = srcFromProps || ''

  if (!src && resource && typeof resource === 'object') {
    const {
      alt: altFromResource,
      height: fullHeight,
      sizes,
      url,
      width: fullWidth,
    } = resource as {
      alt?: string | null
      height?: number | null
      sizes?: Partial<Record<ImageSize, { url?: string | null; width?: number | null; height?: number | null }>>
      url?: string | null
      width?: number | null
    }

    // Если просили конкретную копию и она есть — берём её. Иначе — оригинал
    const copy = imageSize ? sizes?.[imageSize] : undefined

    if (copy?.url) {
      src = copy.url
      width = widthFromProps ?? copy.width
      height = heightFromProps ?? copy.height
    } else {
      src = url || ''
      width = widthFromProps ?? fullWidth
      height = heightFromProps ?? fullHeight
    }

    alt = altFromResource ?? undefined
  }

  // NOTE: this is used by the browser to determine which image to download at different screen sizes
  const sizes = sizeFromProps
    ? sizeFromProps
    : Object.entries(breakpoints)
        .map(([, value]) => `(max-width: ${value}px) ${value}px`)
        .join(', ')

  return (
    <NextImage
      alt={alt || ''}
      className={cn(imgClassName)}
      fill={fill}
      height={!fill ? height || heightFromProps : undefined}
      onClick={onClick}
      onLoad={() => {
        setIsLoading(false)
        if (typeof onLoadFromProps === 'function') {
          onLoadFromProps()
        }
      }}
      fetchPriority={priority ? 'high' : undefined}
      loading={priority ? 'eager' : undefined}
      priority={priority}
      quality={75}
      sizes={sizes}
      src={src}
      width={!fill ? width || widthFromProps : undefined}
    />
  )
}