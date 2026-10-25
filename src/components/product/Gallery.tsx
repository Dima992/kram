'use client'

import type { Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { DefaultDocumentIDType } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const [current, setCurrent] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [open, setOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const swiped = useRef(false)

  const total = gallery.length
  const currentItem = gallery[current]

  const goPrev = () => {
    setZoomed(false)
    setCurrent((c) => Math.max(0, c - 1))
  }
  const goNext = () => {
    setZoomed(false)
    setCurrent((c) => Math.min(total - 1, c + 1))
  }
  const close = () => {
    setOpen(false)
    setZoomed(false)
  }

  // Выбор варианта: переходим к фото, привязанному к варианту
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

  // Клавиши ← → и Esc, блокировка прокрутки страницы под окном
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, total])

  // Свайп пальцем (один палец и только без зума)
  const onTouchStart = (e: React.TouchEvent) => {
    swiped.current = false
    if (e.touches.length !== 1 || zoomed) {
      touchStartX.current = null
      return
    }
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 40) {
      swiped.current = true
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  // Клик по большому фото в окне: зум, но не после свайпа
  const onImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (swiped.current) {
      swiped.current = false
      return
    }
    setZoomed((z) => !z)
  }

  return (
    <div>
      <div
        className="relative mb-8 w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
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

      {/* Большое окно фото */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
            aria-label="Закрыть"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded bg-black text-white hover:opacity-80"
          >
            <X className="size-5" />
          </button>

          <div className="absolute top-4 left-4 z-10 rounded bg-black px-3 py-1 text-sm text-white">
            {current + 1} / {total}
          </div>

          {current > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              aria-label="Предыдущее фото"
              className="absolute top-1/2 left-3 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded bg-black text-white hover:opacity-80"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {current < total - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              aria-label="Следующее фото"
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded bg-black text-white hover:opacity-80"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div
            className={
              zoomed
                ? 'h-full w-full overflow-auto'
                : 'flex h-full w-full items-center justify-center p-4'
            }
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              onClick={onImageClick}
              className={zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}
              style={{ transform: zoomed ? 'scale(2)' : 'scale(1)', transformOrigin: 'center' }}
            >
              <Media
                resource={currentItem.image}
                className="w-auto"
                imgClassName="h-[90vh] w-auto max-w-[95vw] object-contain"
                size="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}