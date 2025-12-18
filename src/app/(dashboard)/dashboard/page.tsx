'use client'

import { useState, useEffect, useCallback, DragEvent } from 'react'
import { useSession } from 'next-auth/react'
import { SortableTemplates } from '@/components/template/sortable-templates'
import { AddTemplateButton } from '@/components/template/add-template-button'
import { CsvImportModal, CsvRowData } from '@/components/csv-import-modal'
import type { Template, Task } from '@/types/api'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // CSV 导入状态
  const [isDragOverCsv, setIsDragOverCsv] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

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

  // CSV 拖拽处理
  const handleCsvDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // 检查是否有 CSV 文件
    const items = Array.from(e.dataTransfer.items)
    const hasCsv = items.some(item =>
      item.kind === 'file' &&
      (item.type === 'text/csv' || item.type === 'application/vnd.ms-excel')
    )
    if (hasCsv) {
      setIsDragOverCsv(true)
    }
  }

  const handleCsvDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // 检查是否真的离开了容器
    const rect = e.currentTarget.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setIsDragOverCsv(false)
    }
  }

  const handleCsvDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOverCsv(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file =>
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.csv')
    )

    if (csvFile) {
      setCsvFile(csvFile)
      setShowCsvModal(true)
    }
  }

  const handleCsvImport = async (date: string, data: CsvRowData[]) => {
    const response = await fetch('/api/metrics/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, data }),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || '导入失败')
    }

    const result = await response.json()
    setImportMessage(result.message)

    // 刷新数据
    await fetchTemplates()

    // 3秒后清除消息
    setTimeout(() => setImportMessage(null), 3000)
  }

  const handleCloseCsvModal = () => {
    setShowCsvModal(false)
    setCsvFile(null)
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
    <div
      className={`max-w-full mx-auto min-h-screen relative ${
        isDragOverCsv ? 'bg-blue-50' : ''
      }`}
      onDragOver={handleCsvDragOver}
      onDragLeave={handleCsvDragLeave}
      onDrop={handleCsvDrop}
    >
      {/* CSV 拖拽提示 */}
      {isDragOverCsv && (
        <div className="fixed inset-0 bg-blue-500/20 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-semibold text-gray-700">释放以导入 CSV 数据</p>
          </div>
        </div>
      )}

      {/* 导入成功消息 */}
      {importMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {importMessage}
        </div>
      )}

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

      {/* CSV 导入模态框 */}
      <CsvImportModal
        isOpen={showCsvModal}
        csvFile={csvFile}
        onClose={handleCloseCsvModal}
        onImport={handleCsvImport}
      />
    </div>
  )
}
