'use client'

import { useState, useEffect, useCallback, useMemo, useRef, DragEvent } from 'react'
import { useSession } from 'next-auth/react'
import { SortableTemplates } from '@/components/template/sortable-templates'
import type { SortableTemplatesHandle } from '@/components/template/sortable-templates'
import { AddTemplateButton } from '@/components/template/add-template-button'
import { CsvImportModal, CsvRowData } from '@/components/csv-import-modal'
import { SortFilterToolbar } from '@/components/template/sort-filter-toolbar'
import type { SortField, SortDirection, FilterPreset, FilterField } from '@/components/template/sort-filter-toolbar'
import type { Template, Task } from '@/types/api'

export default function DashboardPage() {
  const { data: session } = useSession()
  const sortableTemplatesRef = useRef<SortableTemplatesHandle>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // 排序/过滤状态（从 localStorage 恢复）
  const SORT_FILTER_KEY = 'sort-filter-state'
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window === 'undefined') return 'order'
    try { return (JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.sortField as SortField) || 'order' } catch { return 'order' }
  })
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (typeof window === 'undefined') return 'desc'
    try { return (JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.sortDirection as SortDirection) || 'desc' } catch { return 'desc' }
  })
  const [filterPreset, setFilterPreset] = useState<FilterPreset>(() => {
    if (typeof window === 'undefined') return 'all'
    try { return (JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.filterPreset as FilterPreset) || 'all' } catch { return 'all' }
  })
  const [filterField, setFilterField] = useState<FilterField>(() => {
    if (typeof window === 'undefined') return 'createdAt'
    try { return (JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.filterField as FilterField) || 'createdAt' } catch { return 'createdAt' }
  })
  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.filterDateFrom || '' } catch { return '' }
  })
  const [filterDateTo, setFilterDateTo] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return JSON.parse(localStorage.getItem(SORT_FILTER_KEY)!)?.filterDateTo || '' } catch { return '' }
  })

  // 排序/过滤状态变化时写入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SORT_FILTER_KEY, JSON.stringify({
        sortField, sortDirection, filterPreset, filterField, filterDateFrom, filterDateTo,
      }))
    } catch { /* ignore */ }
  }, [sortField, sortDirection, filterPreset, filterField, filterDateFrom, filterDateTo])

  // 卡片尺寸状态
  const CARD_SIZES = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
  const CARD_SIZE_KEY = 'card-size-index'
  const [cardSizeIndex, setCardSizeIndex] = useState(() => {
    if (typeof window === 'undefined') return 2
    try {
      const stored = localStorage.getItem(CARD_SIZE_KEY)
      if (stored !== null) {
        const idx = parseInt(stored, 10)
        if (idx >= 0 && idx < CARD_SIZES.length) return idx
      }
    } catch { /* ignore */ }
    return 2
  })
  const cardSize = CARD_SIZES[cardSizeIndex]

  const handleCardSizeDecrease = () => {
    setCardSizeIndex(prev => {
      const next = Math.max(0, prev - 1)
      localStorage.setItem(CARD_SIZE_KEY, String(next))
      return next
    })
  }

  const handleCardSizeIncrease = () => {
    setCardSizeIndex(prev => {
      const next = Math.min(CARD_SIZES.length - 1, prev + 1)
      localStorage.setItem(CARD_SIZE_KEY, String(next))
      return next
    })
  }

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
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOverCsv(true)
  }

  const handleCsvDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOverCsv(false)
  }

  const handleCsvDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOverCsv(false)

    const files = Array.from(e.dataTransfer.files)
    const foundCsvFile = files.find(file =>
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.csv')
    )

    if (foundCsvFile) {
      setCsvFile(foundCsvFile)
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

  const handleSortFilterReset = () => {
    setSortField('order')
    setSortDirection('desc')
    setFilterPreset('all')
    setFilterField('createdAt')
    setFilterDateFrom('')
    setFilterDateTo('')
    try { localStorage.removeItem(SORT_FILTER_KEY) } catch { /* ignore */ }
  }

  const isDndDisabled = sortField !== 'order' || filterPreset !== 'all'

  const displayedTemplates = useMemo(() => {
    let result = [...templates]

    // 1. 过滤模板
    if (filterPreset !== 'all') {
      const now = new Date()
      let fromDate: Date | null = null
      let toDate: Date | null = null

      if (filterPreset === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } else if (filterPreset === 'thisWeek') {
        const day = now.getDay() || 7
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1)
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } else if (filterPreset === 'thisMonth') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      } else if (filterPreset === 'custom') {
        if (filterDateFrom) fromDate = new Date(filterDateFrom)
        if (filterDateTo) toDate = new Date(filterDateTo + 'T23:59:59')
      }

      result = result.filter((t) => {
        const dateValue = new Date(t[filterField])
        if (fromDate && dateValue < fromDate) return false
        if (toDate && dateValue > toDate) return false
        return true
      })
    }

    // 2. 排序模板
    if (sortField !== 'order') {
      result.sort((a, b) => {
        const aVal = new Date(a[sortField]).getTime()
        const bVal = new Date(b[sortField]).getTime()
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      })
    }

    // 3. 排序各模板内的任务
    if (sortField !== 'order') {
      result = result.map((t) => ({
        ...t,
        tasks: [...(t.tasks || [])].sort((a, b) => {
          const aVal = new Date(a[sortField]).getTime()
          const bVal = new Date(b[sortField]).getTime()
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }),
      }))
    }

    return result
  }, [templates, sortField, sortDirection, filterPreset, filterField, filterDateFrom, filterDateTo])

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
    <div className="max-w-full mx-auto min-h-screen relative">
      {/* 导入成功消息 */}
      {importMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {importMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">任务跟踪</h2>

        {/* CSV 拖拽区域 - 居中 */}
        <div
          className={`flex-1 mx-4 py-2 px-4 border-2 border-dashed rounded-lg text-center text-sm transition-all ${
            isDragOverCsv
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-gray-300 text-gray-400 hover:border-gray-400'
          }`}
          onDragOver={handleCsvDragOver}
          onDragLeave={handleCsvDragLeave}
          onDrop={handleCsvDrop}
        >
          {isDragOverCsv ? '释放以导入 CSV 数据' : '拖拽 CSV 文件到此处导入数据'}
        </div>

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

      <SortFilterToolbar
        sortField={sortField}
        sortDirection={sortDirection}
        filterPreset={filterPreset}
        filterField={filterField}
        filterDateFrom={filterDateFrom}
        filterDateTo={filterDateTo}
        onSortFieldChange={setSortField}
        onSortDirectionChange={setSortDirection}
        onFilterPresetChange={setFilterPreset}
        onFilterFieldChange={setFilterField}
        onFilterDateFromChange={setFilterDateFrom}
        onFilterDateToChange={setFilterDateTo}
        onReset={handleSortFilterReset}
        onCollapseAll={() => sortableTemplatesRef.current?.collapseAll()}
        onExpandAll={() => sortableTemplatesRef.current?.expandAll()}
        cardSizeLabel={`${cardSize}`}
        onCardSizeDecrease={handleCardSizeDecrease}
        onCardSizeIncrease={handleCardSizeIncrease}
        canDecrease={cardSizeIndex > 0}
        canIncrease={cardSizeIndex < CARD_SIZES.length - 1}
      />

      {displayedTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {templates.length === 0 ? (
            <>
              暂无模板数据
              {canEdit && <p className="mt-2 text-sm">点击&quot;添加模板&quot;开始创建</p>}
            </>
          ) : (
            <>当前筛选条件下无结果</>
          )}
        </div>
      ) : (
        <SortableTemplates
          ref={sortableTemplatesRef}
          templates={displayedTemplates}
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
          dragDisabled={isDndDisabled}
          cardSize={cardSize}
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
