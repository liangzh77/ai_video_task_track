'use client'

import { useState } from 'react'
import { Thumbnail } from '@/components/image/thumbnail'
import { Button } from '@/components/ui/button'
import type { Template } from '@/types/api'

interface TemplateRowProps {
  template: Template
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  canEdit?: boolean
  onDelete?: (templateId: string) => Promise<void>
}

export function TemplateRow({
  template,
  onImageClick,
  selectedImageUrl,
  canEdit = false,
  onDelete,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const images = typeof template.images === 'string'
    ? JSON.parse(template.images) as string[]
    : template.images as string[]

  const copyTexts = typeof template.copyTexts === 'string'
    ? JSON.parse(template.copyTexts) as string[]
    : template.copyTexts as string[]

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

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 group">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-blue-900 min-w-[120px]">
          {template.name}
        </h3>

        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((url, index) => (
              <Thumbnail
                key={`${template.id}-img-${index}`}
                src={url}
                alt={`${template.name} 图片 ${index + 1}`}
                onClick={() => onImageClick(url)}
                isSelected={selectedImageUrl === url}
                draggable={canEdit}
              />
            ))}
          </div>
        )}

        {copyTexts.length > 0 && (
          <div className="flex flex-col gap-1 ml-4">
            {copyTexts.map((text, index) => (
              <span
                key={`${template.id}-text-${index}`}
                className="text-sm text-gray-600 bg-white px-2 py-1 rounded"
              >
                {text}
              </span>
            ))}
          </div>
        )}

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
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
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
