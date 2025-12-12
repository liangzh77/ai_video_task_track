'use client'

import Image from 'next/image'

interface ThumbnailProps {
  src: string
  alt?: string
  onClick?: () => void
  isSelected?: boolean
}

export function Thumbnail({ src, alt = '缩略图', onClick, isSelected = false }: ThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-[100px] flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
      }`}
    >
      <Image
        src={src}
        alt={alt}
        width={100}
        height={100}
        className="h-full w-auto object-contain"
        unoptimized
      />
    </button>
  )
}
