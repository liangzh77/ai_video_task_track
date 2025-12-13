'use client'

import { useState } from 'react'
import { Thumbnail } from '@/components/image/thumbnail'
import { EditableField } from '@/components/task/editable-field'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { Task } from '@/types/api'

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
  const images = typeof task.images === 'string'
    ? JSON.parse(task.images) as string[]
    : task.images as string[]

  const copyTexts = typeof task.copyTexts === 'string'
    ? JSON.parse(task.copyTexts) as string[]
    : task.copyTexts as string[]

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
    <div className="bg-white border rounded-lg p-3 sm:p-4 ml-2 sm:ml-6 hover:shadow-sm transition-shadow group">
      <div className="flex flex-col sm:flex-row flex-wrap items-start gap-3 sm:gap-4">
        {/* Images */}
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            {images.map((url, index) => (
              <Thumbnail
                key={`${task.id}-img-${index}`}
                src={url}
                alt={`任务图片 ${index + 1}`}
                onClick={() => onImageClick(url)}
                isSelected={selectedImageUrl === url}
              />
            ))}
          </div>
        )}

        {/* Copy Texts */}
        {copyTexts.length > 0 && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            {copyTexts.map((text, index) => (
              <span
                key={`${task.id}-text-${index}`}
                className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded break-all"
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Task Info */}
        <div className="w-full sm:flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
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
