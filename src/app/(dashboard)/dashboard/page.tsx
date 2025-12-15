'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { SortableTemplates } from '@/components/template/sortable-templates'
import { AddTemplateButton } from '@/components/template/add-template-button'
import type { Template, Task } from '@/types/api'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '获取数据失败')
      }
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleImageClick = (url: string) => {
    setPreviewImage(url === previewImage ? null : url)
  }

  const handleAddTemplate = async (name: string) => {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '创建失败')
    }

    const newTemplate = await response.json()
    setTemplates([...templates, { ...newTemplate, tasks: [] }])
  }

  const handleDeleteTemplate = async (templateId: string) => {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '删除失败')
    }

    setTemplates(templates.filter(t => t.id !== templateId))
  }

  const handleAddTask = async (templateId: string) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '创建失败')
    }

    const newTask = await response.json()
    setTemplates(templates.map(t =>
      t.id === templateId
        ? { ...t, tasks: [...(t.tasks || []), newTask] }
        : t
    ))
  }

  const handleDeleteTask = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || '删除失败')
    }

    setTemplates(templates.map(t => ({
      ...t,
      tasks: t.tasks?.filter(tk => tk.id !== taskId)
    })))
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTemplates(templates.map(t => ({
      ...t,
      tasks: t.tasks?.map(tk =>
        tk.id === taskId ? { ...tk, ...updates } : tk
      )
    })))
  }

  const handleTemplateUpdate = (templateId: string, updates: Partial<Template>) => {
    setTemplates(templates.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    ))
  }

  const handleTemplatesReorder = async (templateIds: string[]) => {
    // Optimistic update
    const reorderedTemplates = templateIds.map(id =>
      templates.find(t => t.id === id)!
    )
    setTemplates(reorderedTemplates)

    try {
      const response = await fetch('/api/templates/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds }),
      })

      if (!response.ok) {
        // Revert on error
        fetchTemplates()
        const data = await response.json()
        throw new Error(data.error || '排序失败')
      }
    } catch (error) {
      console.error('模板排序失败:', error)
      fetchTemplates()
    }
  }

  const handleTasksReorder = async (templateId: string, taskIds: string[]) => {
    // Optimistic update
    setTemplates(templates.map(t => {
      if (t.id !== templateId) return t
      const reorderedTasks = taskIds
        .map(id => t.tasks?.find(tk => tk.id === id))
        .filter((task): task is Task => task !== undefined)
      return { ...t, tasks: reorderedTasks }
    }))

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, taskIds }),
      })

      if (!response.ok) {
        // Revert on error
        fetchTemplates()
        const data = await response.json()
        throw new Error(data.error || '排序失败')
      }
    } catch (error) {
      console.error('任务排序失败:', error)
      fetchTemplates()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const canEdit = session?.user?.canCRUD || session?.user?.canApprove || false

  return (
    <div className="max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">任务跟踪</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="text-sm text-gray-500">
            欢迎，{session?.user?.username}
            {session?.user?.canCRUD && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                可编辑
              </span>
            )}
            {session?.user?.canApprove && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                可审批
              </span>
            )}
          </div>
          {canEdit && <AddTemplateButton onAdd={handleAddTemplate} />}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无模板数据
          {canEdit && <p className="mt-2 text-sm">点击&quot;添加模板&quot;开始创建</p>}
        </div>
      ) : (
        <SortableTemplates
          templates={templates}
          onImageClick={handleImageClick}
          selectedImageUrl={previewImage}
          canEdit={canEdit}
          canApprove={session?.user?.canApprove}
          currentUserId={session?.user?.id}
          currentUsername={session?.user?.username}
          onReorder={handleTemplatesReorder}
          onDeleteTemplate={handleDeleteTemplate}
          onTemplateUpdate={handleTemplateUpdate}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onTaskUpdate={handleTaskUpdate}
          onTasksReorder={handleTasksReorder}
        />
      )}

      {/* Click preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 z-10"
              aria-label="关闭预览"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={previewImage}
              alt="预览图片"
              width={1200}
              height={900}
              className="object-contain rounded-lg max-h-[85vh]"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
