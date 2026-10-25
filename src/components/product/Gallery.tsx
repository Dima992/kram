'use client'

import type { Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { DefaultDocumentIDType } from 'payload'
import React, { useEffect, useRef } from 'react'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const [current, setCurrent] = React.useState(0)
  const [api, setApi] = React.useState<CarouselApi>()
  const [open, setOpen] = React.useState(false)
  const touchStartX = useRef<number | null>(null)

  const total = gallery.length
  const currentItem = gallery[current]

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1))
  const goNext = () => setCurrent((c) => Math.min(total - 1, c + 1))

  useEffect(() => {
    const values = Array.from(searchParams.values())

    if (values && api) {
      const index = gallery.findIndex((item) => {
        if (!item.variantOption) return false

        let variantID: DefaultDocumentIDType

        if (typeof item.variantOption === 'object') {
          variantID = item.variantOption.id
        } else variantID = item.variantOption

        return Boolean(values.find((value) => value === String(variantID)))
      })
      if (index !== -1) {
        setCurrent(index)
        api.scrollTo(index, true)
      }
    }
  }, [searchParams, api, gallery])

  // Свайп пальцем по большому фото
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -40) goNext()
    if (dx > 40) goPrev()
  }

  return (
    <div>
      <div
        className="relative mb-8 w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Нажатие на фото открывает его крупно */}
        <button
          type="button"
          className="block w-full"
          onClick={() => setOpen(true)}
          aria-label="Открыть фото крупно"
        >
          <Media
            priority={current === 0}
            resource={currentItem.image}
            className="w-full"
            imgClassName="w-full rounded-lg"
            size="(min-width: 1024px) 50vw, 100vw"
          />
        </button>

        {current > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Предыдущее фото"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {current < total - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Следующее фото"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      <Carousel setApi={setApi} className="w-full" opts={{ align: 'start', loop: false }}>
        <CarouselContent>
          {gallery.map((item, i) => {
            if (typeof item.image !== 'object') return null

            return (
              <CarouselItem
                className="basis-1/5"
                key={`${item.image.id}-${i}`}
                onClick={() => setCurrent(i)}
              >
      <div className="relative aspect-square w-full overflow-hidden rounded-md">
                  <GridTileImage active={i === current} media={item.image} sizes="20vw" />
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      {/* Крупное фото в отдельном окне */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Фото товара</DialogTitle>
          <Media
            resource={currentItem.image}
            className="w-full"
            imgClassName="w-full max-h-[85vh] object-contain"
            size="100vw"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}