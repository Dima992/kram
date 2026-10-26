'use client'

import { useState } from 'react'

// Достаёт код ролика из обычной ссылки YouTube
export const getYouTubeId = (url?: string | null): string | null => {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return match ? match[1] : null
}

type Props = {
  url?: string | null
  title?: string
  className?: string
}

// Сначала показываем обложку. Плеер YouTube грузится только после нажатия.
export function YouTubePlayer({ url, title = 'Відео', className = '' }: Props) {
  const [playing, setPlaying] = useState(false)
  const id = getYouTubeId(url)
  if (!id) return null

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900 ${className}`}
    >
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Відтворити відео"
          className="group absolute inset-0 flex items-center justify-center"
        >
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:bg-black/90">
            ▶
          </span>
        </button>
      )}
    </div>
  )
}