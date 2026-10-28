import type { Media as MediaType } from '@/payload-types'
import Image from 'next/image'

type Props = {
  photo: MediaType
  sizes: string
  priority?: boolean
  className?: string
}

// Фото категории: обрезка под рамку с учётом точки фокуса, которую выбрали в админке
export const CategoryPhoto: React.FC<Props> = ({ photo, sizes, priority = false, className }) => {
  const focal = photo as { focalX?: number | null; focalY?: number | null }
  const x = typeof focal.focalX === 'number' ? focal.focalX : 50
  const y = typeof focal.focalY === 'number' ? focal.focalY : 50

  if (!photo.url) return null

  return (
    <Image
      src={photo.url}
      alt={photo.alt || ''}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ objectFit: 'cover', objectPosition: `${x}% ${y}%` }}
    />
  )
}