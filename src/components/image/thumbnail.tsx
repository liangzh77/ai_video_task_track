'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ThumbnailProps {
  src: string
  alt?: string
  onClick?: () => void
  isSelected?: boolean
}

export function Thumbnail({ src, alt = '缩略图', onClick, isSelected = false }: ThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-[100px] flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={100}
        height={100}
        className={`h-full w-auto object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        sizes="100px"
      />
    </button>
  )
}
