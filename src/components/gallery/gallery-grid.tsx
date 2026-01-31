'use client'

import type { GalleryItem } from '@/types/api'
import { GalleryCard } from './gallery-card'

interface GalleryGridProps {
  items: GalleryItem[]
  canEdit: boolean
  columns: number
  onItemEdit: (item: GalleryItem) => void
  onItemDelete: (id: string) => void
  onItemClick: (item: GalleryItem, playableUrl: string | null) => void
}

export function GalleryGrid({ items, canEdit, columns, onItemEdit, onItemDelete, onItemClick }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg">暂无作品</p>
        <p className="text-sm mt-1">点击上方按钮添加第一个作品</p>
      </div>
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {items.map(item => (
        <GalleryCard
          key={item.id}
          item={item}
          canEdit={canEdit}
          onEdit={() => onItemEdit(item)}
          onDelete={() => onItemDelete(item.id)}
          onClick={(playableUrl) => onItemClick(item, playableUrl)}
        />
      ))}
    </div>
  )
}
