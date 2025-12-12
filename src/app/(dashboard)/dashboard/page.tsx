'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TemplateRow } from '@/components/template/template-row'
import { TaskRow } from '@/components/task/task-row'
import { PreviewPanel } from '@/components/image/preview-panel'
import { AddTemplateButton } from '@/components/template/add-template-button'
import { AddTaskButton } from '@/components/task/add-task-button'
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

  const canEdit = session?.user?.canCRUD || false

  return (
    <div className="max-w-full mx-auto">
      <div className="flex gap-6">
        {/* Left: Content Area (2/3) */}
        <div className="w-2/3 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">任务跟踪</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                欢迎，{session?.user?.username}
                {canEdit && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                    可编辑
                  </span>
                )}
                {session?.user?.canApprove && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
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
            templates.map((template) => (
              <div key={template.id} className="space-y-2">
                <TemplateRow
                  template={template}
                  onImageClick={handleImageClick}
                  selectedImageUrl={previewImage}
                  canEdit={canEdit}
                  onDelete={handleDeleteTemplate}
                />

                {template.tasks && template.tasks.length > 0 && (
                  <div className="space-y-2">
                    {template.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onImageClick={handleImageClick}
                        selectedImageUrl={previewImage}
                        canEdit={canEdit}
                        canApprove={session?.user?.canApprove}
                        currentUserId={session?.user?.id}
                        currentUsername={session?.user?.username}
                        onTaskUpdate={handleTaskUpdate}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="ml-6">
                    <AddTaskButton templateId={template.id} onAdd={handleAddTask} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Preview Panel (1/3) */}
        <div className="w-1/3">
          <PreviewPanel imageUrl={previewImage} />
        </div>
      </div>
    </div>
  )
}
