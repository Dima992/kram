'use client'

import type { Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { YouTubePlayer } from '@/components/YouTubePlayer'
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { DefaultDocumentIDType } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

type Props = {
  gallery: NonNullable<Product['gallery']>
}

type Pt = { x: number; y: number }

const MIN_ZOOM = 1
const MAX_ZOOM = 4

export const Gallery: React.FC<Props> = ({ gallery }) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isRu = pathname === '/ru' || pathname.startsWith('/ru/')
  const t = isRu
    ? { pinch: 'Щипок пальцами — зум', wheel: 'Колесо мыши — зум, фото можно тянуть' }
    : { pinch: 'Щипок пальцями — збільшення', wheel: 'Колесо миші — збільшення, фото можна тягнути' }

  const [current, setCurrent] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 })

  // Контейнер самого фото: по его размеру считаем, докуда можно сдвигать
  const imgRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Pt>())
  const drag = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const movedRef = useRef(false)
  const touchStartX = useRef<number | null>(null)

  const total = gallery.length
  const currentItem = gallery[current]

  // Текущий слайд: либо фото, либо видео YouTube
  const currentImage =
    currentItem && typeof currentItem.image === 'object' && currentItem.image
      ? currentItem.image
      : undefined
  const currentVideo =
    currentItem?.mediaType === 'youtube' && currentItem.youtubeUrl ? currentItem.youtubeUrl : undefined

  // Фото нельзя сдвинуть дальше его собственного края: край не уходит за край экрана
  const clampPos = (p: Pt, z: number): Pt => {
    const el = imgRef.current
    const w = el ? el.offsetWidth : window.innerWidth
    const h = el ? el.offsetHeight : window.innerHeight
    const maxX = Math.max(0, (w * z - window.innerWidth) / 2)
    const maxY = Math.max(0, (h * z - window.innerHeight) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    }
  }

  const resetZoom = () => {
    setZoom(1)
    setPos({ x: 0, y: 0 })
  }

  const zoomTo = (value: number) => {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
    setZoom(z)
    setPos((p) => clampPos(p, z))
  }

  const goPrev = () => {
    resetZoom()
    setCurrent((c) => Math.max(0, c - 1))
  }
  const goNext = () => {
    resetZoom()
    setCurrent((c) => Math.min(total - 1, c + 1))
  }
  const close = () => {
    setOpen(false)
    resetZoom()
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

  // Свайп на обычной карточке фото
  const onCardTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onCardTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -40) goNext()
    if (dx > 40) goPrev()
  }

  // Колесо мыши: зум в точку под курсором, как на картах
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Положение курсора относительно центра окна
    const cx = e.clientX - (rect.left + rect.width / 2)
    const cy = e.clientY - (rect.top + rect.height / 2)

    const z1 = zoom
    const z2 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (e.deltaY < 0 ? 0.25 : -0.25)))
    if (z2 === z1) return

    // Сдвигаем фото так, чтобы точка под курсором осталась на месте
    const k = z2 / z1
    setZoom(z2)
    setPos(clampPos({ x: cx - (cx - pos.x) * k, y: cy - (cy - pos.y) * k }, z2))
  }

  // Большое окно: щипок (телефон), перетаскивание, свайп
  const onStageDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    movedRef.current = false

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
      drag.current = null
    } else {
      drag.current = { x: e.clientX, y: e.clientY, baseX: pos.x, baseY: pos.y }
    }
  }

  const onStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY

    // Два пальца: щипок меняет зум
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      movedRef.current = true
      zoomTo((pinch.current.zoom * dist) / pinch.current.dist)
      return
    }

    // Один палец или мышь: перетаскивание при зуме
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) movedRef.current = true
    if (zoom > 1) {
      setPos(clampPos({ x: d.baseX + dx, y: d.baseY + dy }, zoom))
    }
  }

  const onStageUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)

    if (pointers.current.size === 0) {
      pinch.current = null
    }

    if (wasSingle && drag.current) {
      const dx = e.clientX - drag.current.x
      // Свайп влево и вправо при обычном размере
      if (zoom === 1 && Math.abs(dx) > 50 && movedRef.current) {
        if (dx < 0) goNext()
        else goPrev()
      }
    }

    drag.current = null
    if (pointers.current.size === 1) {
      const [only] = Array.from(pointers.current.values())
      drag.current = { x: only.x, y: only.y, baseX: pos.x, baseY: pos.y }
    }
  }

  return (
    <div>
      <div
        className="relative mb-8 w-full overflow-hidden"
        onTouchStart={onCardTouchStart}
        onTouchEnd={onCardTouchEnd}
      >
        {currentVideo ? (
          <YouTubePlayer url={currentVideo} title="Відео" />
        ) : (
          <button
            type="button"
            className="block w-full"
            onClick={() => {
              if (currentImage) setOpen(true)
            }}
            aria-label="Открыть фото крупно"
          >
            {currentImage ? (
              <Media
                priority={current === 0}
                resource={currentImage}
                className="w-full"
                imgClassName="w-full rounded-lg"
                size="(min-width: 1024px) 50vw, 100vw"
              />
            ) : null}
          </button>
        )}

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
            const image =
              typeof item.image === 'object' && item.image ? item.image : undefined
            const video =
              item.mediaType === 'youtube' && item.youtubeUrl ? item.youtubeUrl : undefined
            if (!image && !video) return null

            return (
              <CarouselItem
                className="basis-1/5"
                key={`${item.id ?? i}`}
                onClick={() => setCurrent(i)}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-md">
                  <GridTileImage
                    active={i === current}
                    media={image}
                    video={video}
                    sizes="20vw"
                  />
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      {/* Большое окно фото (для видео не нужно, оно открывается на месте) */}
      {open && currentImage && (
        <div className="fixed inset-0 z-[100] bg-black/90">
          <div
            className="flex h-full w-full touch-none select-none items-center justify-center overflow-hidden"
            onPointerDown={onStageDown}
            onPointerMove={onStageMove}
            onPointerUp={onStageUp}
            onPointerCancel={onStageUp}
            onWheel={onWheel}
          >
            <div
              ref={imgRef}
              className={zoom > 1 ? 'cursor-grab' : 'cursor-default'}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                transition: pointers.current.size > 0 ? 'none' : 'transform 0.2s ease',
              }}
            >
              <Media
                resource={currentImage}
                className="w-auto"
                imgClassName="max-h-[90vh] max-w-[95vw] w-auto object-contain"
                size="100vw"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Закрыть"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded bg-black text-white hover:opacity-80 md:size-12"
          >
            <X className="size-6" />
          </button>

          <div className="absolute top-4 left-4 z-10 rounded bg-black px-3 py-1 text-sm text-white">
            {current + 1} / {total}
          </div>

          {current > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Предыдущее фото"
              className="absolute top-1/2 left-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded bg-black text-white hover:opacity-80 md:size-14"
            >
              <ChevronLeft className="size-6 md:size-8" />
            </button>
          )}

          {current < total - 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Следующее фото"
              className="absolute top-1/2 right-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded bg-black text-white hover:opacity-80 md:size-14"
            >
              <ChevronRight className="size-6 md:size-8" />
            </button>
          )}

          {/* Внизу: на ПК кнопки зума и подсказка, на телефоне только подсказка */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded bg-black px-3 py-1 text-sm text-white">
            <button
              type="button"
              aria-label="Уменьшить"
              onClick={() => zoomTo(zoom - 0.5)}
              className="hidden size-8 rounded hover:bg-white/20 md:block"
            >
              −
            </button>
            <span className="hidden w-12 text-center md:inline">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              aria-label="Увеличить"
              onClick={() => zoomTo(zoom + 0.5)}
              className="hidden size-8 rounded hover:bg-white/20 md:block"
            >
              +
            </button>
            <span className="md:hidden">{t.pinch}</span>
            <span className="hidden md:inline">{t.wheel}</span>
          </div>
        </div>
      )}
    </div>
  )
}