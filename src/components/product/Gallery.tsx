'use client'

import type { Product } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media } from '@/components/Media'
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { getYouTubeId } from '@/utilities/youtube'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
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
    ? {
        pinch: 'Щипок пальцами — зум',
        wheel: 'Колесо мыши — зум, фото можно тянуть',
        openVideo: 'Открыть видео',
      }
    : {
        pinch: 'Щипок пальцями — збільшення',
        wheel: 'Колесо миші — збільшення, фото можна тягнути',
        openVideo: 'Відкрити відео',
      }

  const [current, setCurrent] = useState(0)
  // Номер слайда, на котором пользователь нажал ▶ в карточке
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [api, setApi] = useState<CarouselApi>()
  // Большой просмотр открыт (для фото и для видео)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 })

  const imgRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Pt>())
  const drag = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const movedRef = useRef(false)
  const touchStartX = useRef<number | null>(null)

  const total = gallery.length
  const currentItem = gallery[current]

  // Первое обычное фото товара: по нему делаем превью видео, если нет кадра
  const coverItem = gallery.find(
    (item) => item.mediaType !== 'youtube' && typeof item.image === 'object' && item.image,
  )
  const coverImage =
    coverItem && typeof coverItem.image === 'object' && coverItem.image ? coverItem.image : undefined

  // Текущий слайд: либо фото, либо видео YouTube
  const currentImage =
    currentItem && typeof currentItem.image === 'object' && currentItem.image
      ? currentItem.image
      : undefined
  const currentVideo =
    currentItem?.mediaType === 'youtube' && currentItem.youtubeUrl ? currentItem.youtubeUrl : undefined
  const currentVideoId = currentVideo ? getYouTubeId(currentVideo) : null
  const isPlaying = playingIndex === current

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

  // При смене слайда плеер в карточке закрывается
  useEffect(() => {
    setPlayingIndex(null)
  }, [current])

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
      }
    }
  }, [searchParams, api, gallery])

  // Ряд миниатюр всегда прокручивается так, чтобы выбранная миниатюра была на виду
  useEffect(() => {
    if (api) api.scrollTo(current)
  }, [current, api])

  // Клавиши ← → и Esc, блокировка прокрутки — только пока большой просмотр открыт
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

  // Свайп на обычной карточке
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
    const cx = e.clientX - (rect.left + rect.width / 2)
    const cy = e.clientY - (rect.top + rect.height / 2)

    const z1 = zoom
    const z2 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (e.deltaY < 0 ? 0.25 : -0.25)))
    if (z2 === z1) return

    const k = z2 / z1
    setZoom(z2)
    setPos(clampPos({ x: cx - (cx - pos.x) * k, y: cy - (cy - pos.y) * k }, z2))
  }

  // Большой просмотр фото: щипок, перетаскивание, свайп
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

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      movedRef.current = true
      zoomTo((pinch.current.zoom * dist) / pinch.current.dist)
      return
    }

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

  // Превью видео в карточке: кадр из самого видео, та же рамка, что у фото
  const renderVideoPreview = () => (
    <button
      type="button"
      className="absolute inset-0 block h-full w-full"
      onClick={() => setPlayingIndex(current)}
      aria-label={t.openVideo}
    >
      <img
        src={`https://i.ytimg.com/vi/${currentVideoId}/hqdefault.jpg`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-black/70 text-white shadow-lg">
          <Play className="size-7 fill-white text-white" />
        </span>
      </span>
    </button>
  )

  // Плеер YouTube в карточке: заполняет рамку целиком
  const renderPlayer = () => (
    <iframe
      className="absolute inset-0 h-full w-full"
      src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&playsinline=1&rel=0`}
      title="Відео"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )

  return (
    <div>
      {/* Одна рамка 4:5 для всех слайдов: фото и видео не меняют размер */}
      <div
        className="relative mb-8 aspect-[4/5] w-full overflow-hidden rounded-lg bg-neutral-100"
        onTouchStart={onCardTouchStart}
        onTouchEnd={onCardTouchEnd}
      >
        {currentVideo ? (
          currentVideoId ? (
            isPlaying ? renderPlayer() : renderVideoPreview()
          ) : null
        ) : (
          <button
            type="button"
            className="absolute inset-0 block h-full w-full"
            onClick={() => {
              if (currentImage) setOpen(true)
            }}
            aria-label="Открыть фото крупно"
          >
            {currentImage ? (
              <Media
                priority={current === 0}
                resource={currentImage}
                fill
                imgClassName="h-full w-full object-cover"
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
            className="absolute top-1/2 left-2 z-[6] -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {current < total - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Следующее фото"
            className="absolute top-1/2 right-2 z-[6] -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      {/* Ряд миниатюр: выбранная всегда видна */}
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

      {/* Большой просмотр: и фото, и видео. Стрелки и закрытие работают для обоих */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/90">
          {currentVideo ? (
            // Видео в большом просмотре: плеер по центру, сразу с воспроизведением
            <div className="flex h-full w-full items-center justify-center p-4">
              {currentVideoId ? (
                <div
                  className="relative aspect-video overflow-hidden rounded-lg bg-black"
                  style={{ width: 'min(95vw, 160vh)' }}
                >
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&playsinline=1&rel=0`}
                    title="Відео"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="flex h-full w-full touch-none select-none items-center justify-center overflow-hidden"
              onPointerDown={onStageDown}
              onPointerMove={onStageMove}
              onPointerUp={onStageUp}
              onPointerCancel={onStageUp}
              onWheel={onWheel}
              onDragStart={(e) => e.preventDefault()}
            >
              <div
                ref={imgRef}
                className={zoom > 1 ? 'cursor-grab' : 'cursor-default'}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                  transition: pointers.current.size > 0 ? 'none' : 'transform 0.2s ease',
                }}
              >
                {currentImage ? (
                  <Media
                    resource={currentImage}
                    className="w-auto"
                    imgClassName="max-h-[90vh] max-w-[95vw] w-auto object-contain"
                    size="100vw"
                  />
                ) : null}
              </div>
            </div>
          )}

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

          {/* Подсказка зума только для фото */}
          {!currentVideo && (
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
          )}
        </div>
      )}
    </div>
  )
}