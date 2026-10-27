'use client'

import React, { useState } from 'react'

type Props = {
  url: string
  title?: string
}

// Достаём код видео из любой ссылки YouTube (youtu.be, watch, embed, shorts)
const getVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

export const YouTubePlayer: React.FC<Props> = ({ url, title = 'Відео' }) => {
  const [playing, setPlaying] = useState(false)
  const id = getVideoId(url)

  if (!id) return null

  // После нажатия: видео с разрешением на полный экран (работает и на телефоне)
  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  // До нажатия: красивое превью с большой кнопкой запуска
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Запустить видео"
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110 md:size-20">
          <svg viewBox="0 0 24 24" className="ml-1 size-8 md:size-10" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  )
}