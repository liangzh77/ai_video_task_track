'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'

interface SortableImageProps {
  id: string
  url: string
  onDelete: (url: string) => void
  onClick: (url: string) => void
  isSelected: boolean
  disabled?: boolean
}

function SortableImage({ id, url, onDelete, onClick, isSelected, disabled }: SortableImageProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(url)
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative h-[100px] group flex-shrink-0 rounded border-2 overflow-hidden
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}
        ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}
      `}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={() => onClick(url)}
        className="h-full relative"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <Image
          src={url}
          alt="图片"
          width={100}
          height={100}
          className={`h-full w-auto object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          sizes="100px"
        />
      </button>

      {!disabled && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      )}

      {!disabled && !showDeleteConfirm && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
        >
          ×
        </button>
      )}

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
          <span className="text-white text-xs">确认删除？</span>
          <div className="flex gap-1">
            <button
              onClick={handleConfirmDelete}
              className="px-2 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              是
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              否
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface SortableImagesProps {
  images: string[]
  onReorder: (newImages: string[]) => void
  onDelete: (url: string) => void
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  disabled?: boolean
}

export function SortableImages({
  images,
  onReorder,
  onDelete,
  onImageClick,
  selectedImageUrl,
  disabled = false,
}: SortableImagesProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string)
      const newIndex = images.indexOf(over.id as string)
      const newImages = arrayMove(images, oldIndex, newIndex)
      onReorder(newImages)
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 flex-wrap">
          {images.map((url) => (
            <SortableImage
              key={url}
              id={url}
              url={url}
              onDelete={onDelete}
              onClick={onImageClick}
              isSelected={selectedImageUrl === url}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
