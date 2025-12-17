'use client'

import { useState, useEffect, DragEvent } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
import { VideoItem } from '@/components/task/video-item'
import { EditableField } from '@/components/task/editable-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { convertToJpg } from '@/lib/image-utils'
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
  const [isSaving, setIsSaving] = useState(false)

  // 解析 items，添加错误处理
  let items: ContentItem[] = []
  try {
    items = typeof task.items === 'string'
      ? JSON.parse(task.items) as ContentItem[]
      : (task.items as ContentItem[]) || []
  } catch {
    console.error('解析 items 失败:', task.items)
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

  const handleFieldSave = async (field: string, value: string | number | boolean | null) => {
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

  const handleRemoveCreator = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeCreator: true }),
      })

      if (!response.ok) {
        throw new Error('移除制作人失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('移除制作人失败:', error)
    }
  }

  const handleClaimSubmitter = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimSubmitter: true }),
      })

      if (!response.ok) {
        throw new Error('认领失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('认领提交者失败:', error)
    }
  }

  const handleRemoveSubmitter = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeSubmitter: true }),
      })

      if (!response.ok) {
        throw new Error('移除提交者失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, updatedTask)
      }
    } catch (error) {
      console.error('移除提交者失败:', error)
    }
  }

  const isSubmitter = task.submitter?.id === currentUserId
  const isCreator = task.creator?.id === currentUserId
  // 移除提交者：需要 canApprove 权限，或者是提交者本人且有 canEdit 权限
  const canRemoveSubmitter = canApprove || (isSubmitter && canEdit)
  // 移除制作人：需要 canApprove 权限，或者是制作人本人且有 canEdit 权限
  const canRemoveCreator = canApprove || (isCreator && canEdit)

  // 更新 items 列表
  const updateItems = async (newItems: ContentItem[]) => {
    setIsSaving(true)
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
    } finally {
      setIsSaving(false)
    }
  }

  // 添加图片到任务
  const addImageToTask = async (imageUrl: string) => {
    // 检查是否已存在相同图片
    if (items.some(item => item.type === 'image' && item.content === imageUrl)) return
    await updateItems([...items, { type: 'image', content: imageUrl }])
  }

  // 上传文件并添加到任务（自动转换为 JPG）
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
      className={`relative bg-white border rounded-lg p-2 ml-2 sm:ml-4 hover:shadow-sm transition-all group ${
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
      <div className="flex flex-col gap-2">
        {/* Items (Images + Texts) + Video */}
        <SortableItems
          items={items}
          onUpdate={updateItems}
          onImageClick={onImageClick}
          selectedImageUrl={selectedImageUrl}
          disabled={!canEdit}
          isSaving={isSaving}
          endSlot={
            <VideoItem
              videoUrl={task.videoUrl}
              onUpdate={async (videoUrl) => {
                await handleFieldSave('videoUrl', videoUrl)
              }}
              disabled={!canEdit}
            />
          }
        />

        {/* Task Info - single row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-gray-500">素材ID：</span>
            <EditableField
              value={task.materialId}
              onSave={(value) => handleFieldSave('materialId', value)}
              disabled={!canEdit}
              placeholder="-"
            />
          </div>

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
            <span className="text-gray-500">提交者：</span>
            {task.submitter ? (
              <>
                <span className="text-gray-900">{task.submitter.username}</span>
                {isSubmitter && (
                  <span className="text-xs text-blue-600">(我)</span>
                )}
                {canRemoveSubmitter && (
                  <button
                    type="button"
                    onClick={handleRemoveSubmitter}
                    className="w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 ml-1"
                    title="移除提交者"
                  >
                    ×
                  </button>
                )}
              </>
            ) : (canEdit || canApprove) && currentUserId ? (
              <button
                type="button"
                onClick={handleClaimSubmitter}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                认领
              </button>
            ) : (
              <span className="text-gray-400">-</span>
            )}
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
              <>
                <span className="text-gray-900">{task.creator.username}</span>
                {isCreator && (
                  <span className="text-xs text-blue-600">(我)</span>
                )}
                {canRemoveCreator && (
                  <button
                    type="button"
                    onClick={handleRemoveCreator}
                    className="w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 ml-1"
                    title="移除制作人"
                  >
                    ×
                  </button>
                )}
              </>
            ) : (canEdit || canApprove) && currentUserId && task.isApproved ? (
              <button
                type="button"
                onClick={handleClaimCreator}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                制作
              </button>
            ) : (
              <span className="text-gray-400">-</span>
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
            <div className="ml-auto">
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2"
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
