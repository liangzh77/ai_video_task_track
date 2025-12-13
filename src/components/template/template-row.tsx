'use client'

import { useState } from 'react'
import { SortableItems } from '@/components/task/sortable-items'
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

  const items: ContentItem[] = typeof template.items === 'string'
    ? JSON.parse(template.items) as ContentItem[]
    : template.items as ContentItem[]

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
      if (onTemplateUpdate) {
        onTemplateUpdate(template.id, updatedTemplate)
      }
    } catch (error) {
      console.error('更新模板失败:', error)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 group">
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
        />
      </div>
    </div>
  )
}
