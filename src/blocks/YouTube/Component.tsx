import { YouTubePlayer } from '@/components/YouTubePlayer';
import React from 'react';

type Props = { url?: string | null; caption?: string | null }

export const YouTubeBlock: React.FC<Props> = ({ url, caption }) => {
  return (
    <figure className="mx-auto w-full max-w-3xl">
      <YouTubePlayer url={url} title={caption || 'Відео'} />
      {caption ? (
        <figcaption className="mt-2 text-sm text-neutral-500">{caption}</figcaption>
      ) : null}
    </figure>
  )
}