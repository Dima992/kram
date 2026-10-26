import type { Media as MediaType } from '@/payload-types'

import { Label } from '@/components/Grid/Label'
import { Media } from '@/components/Media'
import { getYouTubeId } from '@/utilities/youtube'
import clsx from 'clsx'
import React from 'react'

type Props = {
  active?: boolean
  isInteractive?: boolean
  label?: {
    amount: number
    position?: 'bottom' | 'center'
    title: string
  }
  media?: MediaType | null
  priority?: boolean
  sizes?: string
  video?: string | null
}

export const GridTileImage: React.FC<Props> = ({
  active,
  isInteractive = true,
  label,
  media,
  priority = false,
  sizes,
  video,
}) => {
  // Точка фокуса из настроек фото (0–100%). Если не задана, берём центр.
  const focal = media as { focalX?: number | null; focalY?: number | null } | null | undefined
  const focalX = typeof focal?.focalX === 'number' ? focal.focalX : 50
  const focalY = typeof focal?.focalY === 'number' ? focal.focalY : 50

  const videoId = video ? getYouTubeId(video) : null

  return (
    <div
      className={clsx(
        'group flex h-full w-full items-center justify-center overflow-hidden rounded-lg border bg-white hover:border-blue-600 dark:bg-black',
        {
          'border-2 border-blue-600': active,
          'border-neutral-200 dark:border-neutral-800': !active,
          relative: label,
        },
      )}
      style={{ '--focal-x': `${focalX}%`, '--focal-y': `${focalY}%` } as React.CSSProperties}
    >
      {videoId ? (
        <>
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white">
              ▶
            </span>
          </span>
        </>
      ) : media ? (
        <Media
          fill
          className={clsx('relative h-full w-full object-cover', {
            'transition duration-300 ease-in-out group-hover:scale-105': isInteractive,
          })}
          imgClassName="h-full w-full object-cover [object-position:var(--focal-x)_var(--focal-y)]"
          priority={priority}
          resource={media}
          size={sizes}
        />
      ) : null}
      {label ? <Label amount={label.amount} position={label.position} title={label.title} /> : null}
    </div>
  )
}