'use client'

import { useState, DragEvent } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
import { EditableField } from '@/components/task/editable-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { Task, ContentItem } from '@/types/api'

interface TaskRowProps {
  task: Task
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  canEdit?: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => Promise<void>
}

export function TaskRow({
  task,
  onImageClick,
  selectedImageUrl,
  canEdit = false,
  canApprove = false,
  currentUserId,
  onTaskUpdate,
  onDelete,
}: TaskRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const items: ContentItem[] = typeof task.items === 'string'
    ? JSON.parse(task.items) as ContentItem[]
    : task.items as ContentItem[]

  const handleFieldSave = async (field: string, value: string | number | boolean) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    }
  }

  const handleApprovalChange = async (checked: boolean) => {
    await handleFieldSave('isApproved', checked)
  }

  const handleClaimCreator = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCreator: true }),
      })

      if (!response.ok) {
        throw new Error('认领失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('认领制作人失败:', error)
    }
  }

  const isCreator = task.creator?.id === currentUserId

  // 更新 items 列表
  const updateItems = async (newItems: ContentItem[]) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  // 添加图片到任务
  const addImageToTask = async (imageUrl: string) => {
    // 检查是否已存在相同图片
    if (items.some(item => item.type === 'image' && item.content === imageUrl)) return
    await updateItems([...items, { type: 'image', content: imageUrl }])
  }

  // 上传文件并添加到任务
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
      await addImageToTask(url)
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
      await addImageToTask(imageUrl)
      return
    }

    // 检查是否有文件
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    for (const file of imageFiles) {
      await uploadAndAddImage(file)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(task.id)
    } catch (error) {
      console.error('删除任务失败:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div
      className={`relative bg-white border rounded-lg p-3 sm:p-4 ml-2 sm:ml-6 hover:shadow-sm transition-all group ${
        isDragOver ? 'border-blue-500 border-2 bg-blue-50 shadow-md' : ''
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
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Items (Images + Texts) */}
        <SortableItems
          items={items}
          onUpdate={updateItems}
          onImageClick={onImageClick}
          selectedImageUrl={selectedImageUrl}
          disabled={!canEdit}
        />

        {/* Task Info */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
          <div>
            <span className="text-gray-500">备注：</span>
            <EditableField
              value={task.notes}
              onSave={(value) => handleFieldSave('notes', value)}
              disabled={!canEdit}
              placeholder="-"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500">状态：</span>
            {canApprove ? (
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={task.isApproved}
                  onCheckedChange={handleApprovalChange}
                />
                <span className={task.isApproved ? 'text-green-600' : 'text-yellow-600'}>
                  {task.isApproved ? '已批准' : '待批准'}
                </span>
              </div>
            ) : (
              task.isApproved ? (
                <span className="text-green-600 font-medium">已批准</span>
              ) : (
                <span className="text-yellow-600 font-medium">待批准</span>
              )
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500">制作人：</span>
            {task.creator ? (
              <span className="text-gray-900">{task.creator.username}</span>
            ) : canEdit && currentUserId ? (
              <button
                type="button"
                onClick={handleClaimCreator}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                认领
              </button>
            ) : (
              <span className="text-gray-400">-</span>
            )}
            {isCreator && (
              <span className="text-xs text-blue-600">(我)</span>
            )}
          </div>

          <div>
            <span className="text-gray-500">上架时间：</span>
            <EditableField
              value={task.publishDate ? new Date(task.publishDate).toISOString().split('T')[0] : ''}
              type="date"
              onSave={(value) => handleFieldSave('publishDate', value)}
              disabled={!canEdit}
              placeholder="-"
            />
          </div>

          <div>
            <span className="text-gray-500">曝光：</span>
            <EditableField
              value={task.exposure}
              type="number"
              onSave={(value) => handleFieldSave('exposure', value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <span className="text-gray-500">注册：</span>
            <EditableField
              value={task.registrations}
              type="number"
              onSave={(value) => handleFieldSave('registrations', value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <span className="text-gray-500">利润：</span>
            <EditableField
              value={task.profit}
              type="number"
              onSave={(value) => handleFieldSave('profit', value)}
              disabled={!canEdit}
              prefix="¥"
            />
          </div>

          {/* Delete button */}
          {canEdit && onDelete && (
            <div className="col-span-full flex justify-end">
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
      </div>
    </div>
  )
}
