'use client'

import { useState, useEffect, DragEvent } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
import { VideoItem } from '@/components/task/video-item'
import { Button } from '@/components/ui/button'
import type { Template, ContentItem } from '@/types/api'

interface TemplateRowProps {
  template: Template
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  canEdit?: boolean
  onDelete?: (templateId: string) => Promise<void>
  onTemplateUpdate?: (templateId: string, updates: Partial<Template>) => void
}

export function TemplateRow({
  template,
  onImageClick,
  selectedImageUrl,
  canEdit = false,
  onDelete,
  onTemplateUpdate,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 解析 items，添加错误处理
  let items: ContentItem[] = []
  try {
    items = typeof template.items === 'string'
      ? JSON.parse(template.items) as ContentItem[]
      : (template.items as ContentItem[]) || []
  } catch {
    console.error('解析 items 失败:', template.items)
  }

  // 防止 isSaving 状态卡住的安全机制
  useEffect(() => {
    if (isSaving) {
      const timeout = setTimeout(() => {
        setIsSaving(false)
      }, 10000) // 10秒后自动重置
      return () => clearTimeout(timeout)
    }
  }, [isSaving])

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(template.id)
    } catch (error) {
      console.error('删除模板失败:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const updateItems = async (newItems: ContentItem[]) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      const updatedTemplate = await response.json()
      // 解析 items 字段（API 返回的是 JSON 字符串）
      if (typeof updatedTemplate.items === 'string') {
        updatedTemplate.items = JSON.parse(updatedTemplate.items)
      }
      if (onTemplateUpdate) {
        onTemplateUpdate(template.id, updatedTemplate)
      }
    } catch (error) {
      console.error('更新模板失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateVideoUrl = async (videoUrl: string | null) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      })

      if (!response.ok) {
        throw new Error('更新视频失败')
      }

      const updatedTemplate = await response.json()
      if (typeof updatedTemplate.items === 'string') {
        updatedTemplate.items = JSON.parse(updatedTemplate.items)
      }
      if (onTemplateUpdate) {
        onTemplateUpdate(template.id, updatedTemplate)
      }
    } catch (error) {
      console.error('更新视频失败:', error)
    }
  }

  // 添加图片到模板
  const addImageToTemplate = async (imageUrl: string) => {
    // 检查是否已存在相同图片
    if (items.some(item => item.type === 'image' && item.content === imageUrl)) return
    await updateItems([...items, { type: 'image', content: imageUrl }])
  }

  // 上传文件并添加到模板
  const uploadAndAddImage = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      console.error('不支持的图片格式')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      console.error('图片大小不能超过 5MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('上传失败')
      }

      const { url } = await uploadResponse.json()
      await addImageToTemplate(url)
    } catch (error) {
      console.error('上传图片失败:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 优先检查是否有内部图片 URL
    const imageUrl = e.dataTransfer.getData('application/x-image-url')
    if (imageUrl) {
      await addImageToTemplate(imageUrl)
      return
    }

    // 检查是否有文件
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    for (const file of imageFiles) {
      await uploadAndAddImage(file)
    }
  }

  return (
    <div
      className={`bg-blue-50 border rounded-lg p-4 group relative ${
        isDragOver ? 'border-blue-500 border-2 bg-blue-100 shadow-md' : 'border-blue-200'
      } ${isUploading ? 'opacity-70' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg z-10">
          <span className="text-sm text-blue-600">上传中...</span>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-900">
            {template.name}
          </h3>

          {/* Delete button */}
          {canEdit && onDelete && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">确认删除？</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '删除中...' : '确认'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  删除
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <SortableItems
          items={items}
          onUpdate={updateItems}
          onImageClick={onImageClick}
          selectedImageUrl={selectedImageUrl}
          disabled={!canEdit}
          draggableImages={canEdit}
          isSaving={isSaving}
          endSlot={
            <VideoItem
              videoUrl={template.videoUrl}
              onUpdate={updateVideoUrl}
              disabled={!canEdit}
            />
          }
        />
      </div>
    </div>
  )
}
