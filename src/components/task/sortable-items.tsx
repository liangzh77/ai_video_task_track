'use client'

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import type { ContentItem } from '@/types/api'

interface SortableItemProps {
  id: string
  item: ContentItem
  onDelete: () => void
  onEdit?: (newContent: string) => void
  onImageClick?: (url: string) => void
  isSelected?: boolean
  disabled?: boolean
  draggable?: boolean
  isSaving?: boolean
}

function SortableItem({
  id,
  item,
  onDelete,
  onEdit,
  onImageClick,
  isSelected,
  disabled,
  draggable = false,
  isSaving = false,
}: SortableItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.content)
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [adjustedPreviewPos, setAdjustedPreviewPos] = useState({ x: 0, y: 0 })
  const [previewMaxWidth, setPreviewMaxWidth] = useState<number | undefined>(undefined)
  const previewRef = useRef<HTMLDivElement>(null)

  // 计算图片预览位置（图片有固定 max-height，可以预估）
  const getAdjustedPosition = (x: number, y: number) => {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const estimatedHeight = viewportHeight * 0.8
    const estimatedWidth = viewportWidth * 0.5

    let adjustedY = y - 100
    let adjustedX = x + 20

    if (adjustedY + estimatedHeight > viewportHeight - 20) {
      adjustedY = viewportHeight - estimatedHeight - 20
    }
    if (adjustedY < 20) {
      adjustedY = 20
    }
    if (adjustedX + estimatedWidth > viewportWidth - 20) {
      adjustedX = x - estimatedWidth - 20
    }

    return { x: adjustedX, y: adjustedY }
  }

  // 根据文案预览窗口实际尺寸调整位置和宽度
  useLayoutEffect(() => {
    if (showPreview && previewRef.current && item.type === 'text') {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const rect = previewRef.current.getBoundingClientRect()
      const actualHeight = rect.height
      const actualWidth = rect.width

      let adjustedY = previewPosition.y - 20
      let adjustedX = previewPosition.x + 20

      // 计算可用的最大宽度（从鼠标位置到右边界）
      const availableWidth = viewportWidth - previewPosition.x - 40 // 20px 左右边距
      setPreviewMaxWidth(Math.max(availableWidth, 200)) // 最小 200px

      // 检查底部是否超出，如果超出则向上移动
      if (adjustedY + actualHeight > viewportHeight - 20) {
        adjustedY = viewportHeight - actualHeight - 20
      }
      // 检查顶部是否超出
      if (adjustedY < 20) {
        adjustedY = 20
      }
      // 检查右侧是否超出（预览窗口会被 maxWidth 限制，不需要移动到左侧）

      setAdjustedPreviewPos({ x: adjustedX, y: adjustedY })
    }
  }, [showPreview, previewPosition, item.type])

  const handleMouseMove = (e: React.MouseEvent) => {
    setPreviewPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    setPreviewPosition({ x, y })
    // 初始位置设为鼠标右侧
    setAdjustedPreviewPos({ x: x + 20, y: y - 20 })
    setShowPreview(true)
  }

  const handleMouseLeave = () => {
    setShowPreview(false)
  }

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
    onDelete()
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  const handleSaveText = () => {
    const trimmedValue = editValue.trim()
    // 只有当文案有变化时才更新到后端
    if (trimmedValue && trimmedValue !== item.content && onEdit) {
      onEdit(trimmedValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditValue(item.content)
      setIsEditing(false)
    }
    // Enter 键正常换行，不阻止
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || item.type !== 'image') return
    e.dataTransfer.setData('text/plain', item.content)
    e.dataTransfer.setData('application/x-image-url', item.content)
    e.dataTransfer.effectAllowed = 'copy'
  }

  if (item.type === 'image') {
    return (
      <>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          relative h-[100px] group flex-shrink-0 rounded border-2 overflow-hidden
          ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}
          ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}
          ${isSaving ? 'pointer-events-none' : ''}
        `}
        {...attributes}
        {...listeners}
        draggable={draggable}
        onDragStart={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={() => onImageClick?.(item.content)}
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
            src={item.content}
            alt="图片"
            width={100}
            height={100}
            className={`h-full w-auto object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            sizes="100px"
            draggable={false}
          />
        </button>

        {/* Saving overlay with scanning effect */}
        {isSaving && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-blue-500/10" />
            <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" style={{ backgroundSize: '100% 50%' }} />
          </div>
        )}

        {!disabled && !isSaving && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
        )}

        {/* Action buttons - Copy and Download always visible, Delete only when not disabled */}
        {!showDeleteConfirm && (
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy image button */}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const response = await fetch(item.content)
                  const blob = await response.blob()
                  await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                  ])
                } catch (error) {
                  console.error('复制图片失败:', error)
                  // 降级为复制链接
                  navigator.clipboard.writeText(item.content)
                }
              }}
              className="w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600"
              title="复制图片"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Download button */}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const response = await fetch(item.content)
                  const blob = await response.blob()
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = item.content.split('/').pop() || 'image'
                  link.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('下载失败:', error)
                }
              }}
              className="w-5 h-5 bg-green-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-green-600"
              title="下载"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {/* Delete button - only when not disabled */}
            {!disabled && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                title="删除"
              >
                ×
              </button>
            )}
          </div>
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

      {/* Image preview on hover */}
      {showPreview && !isEditing && !showDeleteConfirm && (() => {
        const pos = getAdjustedPosition(previewPosition.x, previewPosition.y)
        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y,
            }}
          >
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-2 max-w-[85vw] max-h-[85vh]">
              <img
                src={item.content}
                alt="预览"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )
      })()}
      </>
    )
  }

  // Text item - 卡片样式，和图片一样高度
  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative h-[100px] min-w-[80px] max-w-[150px] group flex-shrink-0 rounded border-2 overflow-hidden bg-gray-100
        ${disabled ? '' : 'cursor-grab active:cursor-grabbing border-gray-200 hover:border-gray-300'}
        ${isSaving ? 'pointer-events-none' : ''}
      `}
      {...attributes}
      {...listeners}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {isEditing ? (
        <div className="absolute inset-0 z-10 p-1">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveText}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-full text-sm resize-none border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入文案..."
          />
        </div>
      ) : (
        <>
          <div
            className={`h-full flex items-center justify-center p-2 ${
              disabled ? '' : 'cursor-pointer hover:bg-gray-200'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) setIsEditing(true)
            }}
          >
            <span className="text-sm text-gray-700 text-center break-words line-clamp-4">
              {item.content}
            </span>
          </div>

          {/* Saving overlay with scanning effect */}
          {isSaving && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-blue-500/10" />
              <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" style={{ backgroundSize: '100% 50%' }} />
            </div>
          )}

          {!disabled && !isSaving && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          )}

          {/* Action buttons - Copy and Download always visible, Delete only when not disabled */}
          {!showDeleteConfirm && (
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(item.content)
                }}
                className="w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600"
                title="复制文案"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              {/* Download button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const blob = new Blob([item.content], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'text.txt'
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                className="w-5 h-5 bg-green-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-green-600"
                title="下载"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {/* Delete button - only when not disabled */}
              {!disabled && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  title="删除"
                >
                  ×
                </button>
              )}
            </div>
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
        </>
      )}
    </div>

    {/* Text preview on hover */}
    {showPreview && !isEditing && !showDeleteConfirm && (
      <div
        ref={previewRef}
        className="fixed z-50 pointer-events-none"
        style={{
          left: adjustedPreviewPos.x,
          top: adjustedPreviewPos.y,
          maxWidth: previewMaxWidth,
        }}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-3 w-fit">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {item.content}
          </p>
        </div>
      </div>
    )}
    </>
  )
}

interface SortableItemsProps {
  items: ContentItem[]
  onUpdate: (items: ContentItem[]) => void
  onImageClick?: (url: string) => void
  selectedImageUrl?: string | null
  disabled?: boolean
  draggableImages?: boolean
  isSaving?: boolean
}

export function SortableItems({
  items,
  onUpdate,
  onImageClick,
  selectedImageUrl,
  disabled = false,
  draggableImages = false,
  isSaving = false,
}: SortableItemsProps) {

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
      const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id)
      const newIndex = items.findIndex((_, i) => `item-${i}` === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      onUpdate(newItems)
    }
  }

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onUpdate(newItems)
  }

  const handleEdit = (index: number, newContent: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], content: newContent }
    onUpdate(newItems)
  }

  const handleAddEmptyText = () => {
    onUpdate([...items, { type: 'text', content: '' }])
  }

  const itemIds = items.map((_, i) => `item-${i}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 flex-wrap items-center min-h-[100px]">
          {items.map((item, index) => (
            <SortableItem
              key={`item-${index}`}
              id={`item-${index}`}
              item={item}
              onDelete={() => handleDelete(index)}
              onEdit={item.type === 'text' ? (newContent) => handleEdit(index, newContent) : undefined}
              onImageClick={onImageClick}
              isSelected={item.type === 'image' && selectedImageUrl === item.content}
              disabled={disabled}
              draggable={draggableImages && item.type === 'image'}
              isSaving={isSaving}
            />
          ))}
          {items.length === 0 && !disabled && (
            <div className="flex items-center justify-center w-[100px] h-[100px] border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs text-center">
              拖拽内容到此处
            </div>
          )}
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddEmptyText}
              className="h-[100px] px-4 whitespace-nowrap ml-auto"
            >
              添加文案
            </Button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
