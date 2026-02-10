'use client'

import { useState, useEffect, DragEvent } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
import { VideoItem } from '@/components/task/video-item'
import { MetricsDisplay } from '@/components/task/metrics-display'
import { EditableField } from '@/components/task/editable-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { convertToJpg } from '@/lib/image-utils'
import type { Task, ContentItem } from '@/types/api'

interface TaskRowProps {
  task: Task
  canEdit?: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => Promise<void>
  cardSize?: number
}

export function TaskRow({
  task,
  canEdit = false,
  canApprove = false,
  currentUserId,
  onTaskUpdate,
  onDelete,
  cardSize,
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

  const handleSubmittedChange = async (checked: boolean) => {
    await handleFieldSave('isSubmitted', checked)
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

  // 添加内容项到任务（图片或文案）
  const addContentItemToTask = async (contentItem: ContentItem) => {
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
        await addContentItemToTask(contentItem)
        return
      } catch {
        // 解析失败，继续检查其他数据类型
      }
    }

    // 兼容：检查是否有内部图片 URL
    const imageUrl = e.dataTransfer.getData('application/x-image-url')
    if (imageUrl) {
      await addImageToTask(imageUrl)
      return
    }

    // 检查是否有文件
    const files = Array.from(e.dataTransfer.files)

    // 处理图片文件
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    for (const file of imageFiles) {
      await uploadAndAddImage(file)
    }

    // 处理文本文件 (.txt, .srt)
    const textFiles = files.filter(file =>
      file.name.endsWith('.txt') || file.name.endsWith('.srt')
    )
    for (const file of textFiles) {
      try {
        const text = await file.text()
        if (text.trim()) {
          await addContentItemToTask({ type: 'text', content: text.trim() })
        }
      } catch (error) {
        console.error('读取文本文件失败:', error)
      }
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

  const handleClearMetrics = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearMetrics: true }),
      })

      if (!response.ok) {
        throw new Error('清除数据失败')
      }

      const updatedTask = await response.json()
      if (onTaskUpdate) {
        onTaskUpdate(task.id, { ...updatedTask, dailyMetrics: [], metricsSummary: undefined })
      }
    } catch (error) {
      console.error('清除数据失败:', error)
    }
  }

  const hasMetrics = task.dailyMetrics && task.dailyMetrics.length > 0

  // 截断文字，超过maxLen个字符显示前面部分+...
  const truncateText = (text: string | null | undefined, maxLen = 15) => {
    if (!text) return ''
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  // 截断用户名，固定宽度120px，超出显示...
  const truncateUsername = (username: string | null | undefined) => {
    if (!username) return ''
    // 大约12个字符能显示在120px内
    return username.length > 12 ? username.slice(0, 12) + '...' : username
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
        {/* Main row: Left info + Right items */}
        <div className="flex gap-3 items-start">
          {/* 左侧：素材ID、备注、反馈 */}
          <div className="flex flex-col gap-0.5 w-[200px] flex-shrink-0 text-xs">
            <div
              className="overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 px-1 rounded"
              title={task.materialId || '点击添加素材ID'}
            >
              <span className="text-gray-500">ID：</span>
              <EditableField
                value={task.materialId}
                onSave={(value) => handleFieldSave('materialId', value)}
                disabled={!canEdit}
                placeholder="-"
              />
            </div>
            <div
              className="overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 px-1 rounded text-gray-500"
              title={task.notes || '点击添加备注'}
            >
              <span className="text-gray-500">备注：</span>
              <EditableField
                value={task.notes}
                onSave={(value) => handleFieldSave('notes', value)}
                disabled={!canEdit}
                placeholder="-"
              />
            </div>
            <div
              className="overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 px-1 rounded text-gray-500"
              title={task.feedback || '点击添加反馈'}
            >
              <span className="text-gray-500">反馈：</span>
              <EditableField
                value={task.feedback}
                onSave={(value) => handleFieldSave('feedback', value)}
                disabled={!canEdit}
                placeholder="-"
              />
            </div>
          </div>

          {/* 右侧：Items (Images + Texts) + Video */}
          <div className="flex-1 min-w-0">
            <SortableItems
              items={items}
              onUpdate={updateItems}
              disabled={!canEdit}
              draggableImages={true}
              isSaving={isSaving}
              cardSize={cardSize}
              endSlot={
                <VideoItem
                  videoUrl={task.videoUrl}
                  onUpdate={async (videoUrl) => {
                    await handleFieldSave('videoUrl', videoUrl)
                  }}
                  disabled={!canEdit}
                  cardSize={cardSize}
                />
              }
            />
          </div>

          {/* Delete button */}
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

        {/* Row 2: 基本信息 + 数据指标（同一行） */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">提交者：</span>
            {task.submitter ? (
              <div className="flex items-center gap-1">
                <span className="text-gray-900">{task.submitter.username}</span>
                {isSubmitter && (
                  <span className="text-blue-600">(我)</span>
                )}
                {canRemoveSubmitter && (
                  <button
                    type="button"
                    onClick={handleRemoveSubmitter}
                    className="w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    title="移除提交者"
                  >
                    ×
                  </button>
                )}
              </div>
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
            {canEdit ? (
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={task.isSubmitted}
                  onCheckedChange={handleSubmittedChange}
                />
                <span className={task.isSubmitted ? 'text-blue-600' : 'text-gray-400'}>
                  {task.isSubmitted ? '已提交' : '待提交'}
                </span>
              </div>
            ) : (
              task.isSubmitted ? (
                <span className="text-blue-600 font-medium">已提交</span>
              ) : (
                <span className="text-gray-400 font-medium">待提交</span>
              )
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500">制作人：</span>
            {task.creator ? (
              <div className="flex items-center gap-1">
                <span className="text-gray-900">{task.creator.username}</span>
                {isCreator && (
                  <span className="text-blue-600">(我)</span>
                )}
                {canRemoveCreator && (
                  <button
                    type="button"
                    onClick={handleRemoveCreator}
                    className="w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    title="移除制作人"
                  >
                    ×
                  </button>
                )}
              </div>
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

          {/* 数据指标（放在同一行右侧） */}
          {hasMetrics && (
            <>
              <div className="flex items-center gap-2">
                <MetricsDisplay
                  summary={task.metricsSummary}
                  dailyMetrics={task.dailyMetrics}
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleClearMetrics}
                    className="w-4 h-4 bg-gray-200 text-gray-500 rounded-full text-xs flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    title="清除数据"
                  >
                    ×
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
