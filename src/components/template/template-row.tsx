'use client'

import { useState, useEffect, useRef, DragEvent } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
import { VideoItem } from '@/components/task/video-item'
import { EditableField } from '@/components/task/editable-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { convertToJpg } from '@/lib/image-utils'
import type { Template, ContentItem } from '@/types/api'

interface TemplateRowProps {
  template: Template
  canEdit?: boolean
  onDelete?: (templateId: string) => Promise<void>
  onTemplateUpdate?: (templateId: string, updates: Partial<Template>) => void
}

export function TemplateRow({
  template,
  canEdit = false,
  onDelete,
  onTemplateUpdate,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 同步模板名称
  useEffect(() => {
    setEditName(template.name)
  }, [template.name])

  // 编辑名称时自动聚焦
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

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

  const handleSaveName = async () => {
    const trimmedName = editName.trim()
    if (!trimmedName) {
      setEditName(template.name)
      setIsEditingName(false)
      return
    }
    if (trimmedName === template.name) {
      setIsEditingName(false)
      return
    }

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error('更新名称失败')
      }

      const updatedTemplate = await response.json()
      if (typeof updatedTemplate.items === 'string') {
        updatedTemplate.items = JSON.parse(updatedTemplate.items)
      }
      if (onTemplateUpdate) {
        onTemplateUpdate(template.id, updatedTemplate)
      }
      setIsEditingName(false)
    } catch (error) {
      console.error('更新模板名称失败:', error)
      setEditName(template.name)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      setEditName(template.name)
      setIsEditingName(false)
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

  const updateNotes = async (notes: string | number) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('更新备注失败')
      }

      const updatedTemplate = await response.json()
      if (typeof updatedTemplate.items === 'string') {
        updatedTemplate.items = JSON.parse(updatedTemplate.items)
      }
      if (onTemplateUpdate) {
        onTemplateUpdate(template.id, updatedTemplate)
      }
    } catch (error) {
      console.error('更新备注失败:', error)
      throw error
    }
  }

  // 添加图片到模板
  const addImageToTemplate = async (imageUrl: string) => {
    // 检查是否已存在相同图片
    if (items.some(item => item.type === 'image' && item.content === imageUrl)) return
    await updateItems([...items, { type: 'image', content: imageUrl }])
  }

  // 上传文件并添加到模板（自动转换为 JPG）
  const uploadAndAddImage = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      console.error('不支持的图片格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) { // 转换前允许更大的文件
      console.error('图片大小不能超过 10MB')
      return
    }

    setIsUploading(true)
    try {
      // 转换为 JPG 格式
      const jpgFile = await convertToJpg(file)

      const formData = new FormData()
      formData.append('file', jpgFile)

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

  // 添加内容项到模板（图片或文案）
  const addContentItemToTemplate = async (contentItem: ContentItem) => {
    // 检查是否已存在相同内容
    if (items.some(item => item.type === contentItem.type && item.content === contentItem.content)) return
    await updateItems([...items, contentItem])
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 优先检查是否有内容项（图片或文案）
    const contentItemData = e.dataTransfer.getData('application/x-content-item')
    if (contentItemData) {
      try {
        const contentItem = JSON.parse(contentItemData) as ContentItem
        await addContentItemToTemplate(contentItem)
        return
      } catch {
        // 解析失败，继续检查其他数据类型
      }
    }

    // 兼容：检查是否有内部图片 URL
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

  // 截断文字，超过15个字符显示...
  const truncateText = (text: string, maxLen = 15) => {
    if (!text) return ''
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  return (
    <div
      className={`bg-blue-50 border rounded-lg p-2 group relative ${
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
      <div className="flex gap-3 items-start">
        {/* 左侧：标题和备注 */}
        <div className="flex flex-col gap-1 w-[120px] flex-shrink-0">
          {isEditingName ? (
            <Input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleNameKeyDown}
              className="h-7 text-sm font-semibold"
            />
          ) : (
            <h3
              className={`text-sm font-semibold text-blue-900 truncate ${
                canEdit ? 'cursor-pointer hover:bg-blue-100 px-1 rounded transition-colors' : ''
              }`}
              onClick={() => canEdit && setIsEditingName(true)}
              title={template.name}
            >
              {truncateText(template.name)}
            </h3>
          )}
          <div
            className="text-xs text-gray-500 truncate cursor-pointer hover:bg-blue-100 px-1 rounded"
            title={template.notes || '点击添加备注'}
            onClick={() => canEdit && document.getElementById(`template-notes-${template.id}`)?.click()}
          >
            <EditableField
              value={template.notes}
              onSave={updateNotes}
              disabled={!canEdit}
              placeholder="备注"
            />
          </div>
        </div>

        {/* 右侧：Items */}
        <div className="flex-1 min-w-0">
          <SortableItems
            items={items}
            onUpdate={updateItems}
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

        {/* 删除按钮 */}
        {canEdit && onDelete && (
          <div className="flex-shrink-0">
            {showDeleteConfirm ? (
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-6 text-xs"
                >
                  {isDeleting ? '...' : '确认'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="h-6 text-xs"
                >
                  取消
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2"
              >
                删除
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
