'use client'

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TemplateRow } from './template-row'
import { AddTaskButton } from '@/components/task/add-task-button'
import { SortableTasks } from '@/components/task/sortable-tasks'
import type { Template, Task } from '@/types/api'

const COLLAPSED_TEMPLATES_KEY = 'collapsed-templates'

// 获取折叠状态
function getCollapsedTemplates(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(COLLAPSED_TEMPLATES_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // ignore
  }
  return new Set()
}

// 保存折叠状态
function saveCollapsedTemplates(collapsed: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COLLAPSED_TEMPLATES_KEY, JSON.stringify([...collapsed]))
  } catch {
    // ignore
  }
}

interface SortableTemplateItemProps {
  template: Template
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onDeleteTemplate: (templateId: string) => Promise<void>
  onTemplateUpdate: (templateId: string, updates: Partial<Template>) => void
  onAddTask: (templateId: string) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTasksReorder: (templateId: string, taskIds: string[]) => Promise<void>
  disabled?: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  cardSize?: number
}

function SortableTemplateItem({
  template,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onDeleteTemplate,
  onTemplateUpdate,
  onAddTask,
  onDeleteTask,
  onTaskUpdate,
  onTasksReorder,
  disabled = false,
  isCollapsed,
  onToggleCollapse,
  cardSize,
}: SortableTemplateItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const taskCount = template.tasks?.length || 0
  const videoCount = template.tasks?.filter(t => t.videoUrl)?.length || 0

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-stretch gap-2">
        {/* Collapse button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center px-2 bg-gray-50 hover:bg-gray-100 rounded-l-lg border border-r-0 border-gray-200 text-gray-500 hover:text-gray-700"
          title={isCollapsed ? '展开' : '折叠'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {taskCount > 0 && (
            <div className="ml-1 flex flex-col items-center text-xs leading-tight">
              <span className="text-gray-400">{taskCount}</span>
              <span className="text-green-500">{videoCount}</span>
            </div>
          )}
        </button>

        {/* Drag handle */}
        {canEdit && !disabled && (
          <div
            {...attributes}
            {...listeners}
            className="flex items-center px-2 cursor-grab active:cursor-grabbing bg-gray-100 hover:bg-gray-200 border border-r-0 border-gray-200"
            title="拖动排序"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <TemplateRow
            template={template}
            canEdit={canEdit}
            onDelete={onDeleteTemplate}
            onTemplateUpdate={onTemplateUpdate}
            cardSize={cardSize}
          />
        </div>
      </div>

      {!isCollapsed && (
        <>
          {template.tasks && template.tasks.length > 0 && (
            <div className="ml-6">
              <SortableTasks
                tasks={template.tasks}
                canEdit={canEdit}
                canApprove={canApprove}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                onTaskUpdate={onTaskUpdate}
                onDeleteTask={onDeleteTask}
                onReorder={(taskIds) => onTasksReorder(template.id, taskIds)}
                dragDisabled={disabled}
                cardSize={cardSize}
              />
            </div>
          )}

          {canEdit && (
            <div className="ml-6">
              <AddTaskButton templateId={template.id} onAdd={onAddTask} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface SortableTemplatesProps {
  templates: Template[]
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onReorder: (templateIds: string[]) => Promise<void>
  onDeleteTemplate: (templateId: string) => Promise<void>
  onTemplateUpdate: (templateId: string, updates: Partial<Template>) => void
  onAddTask: (templateId: string) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTasksReorder: (templateId: string, taskIds: string[]) => Promise<void>
  dragDisabled?: boolean
  cardSize?: number
}

export interface SortableTemplatesHandle {
  collapseAll: () => void
  expandAll: () => void
}

export const SortableTemplates = forwardRef<SortableTemplatesHandle, SortableTemplatesProps>(function SortableTemplates({
  templates,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onReorder,
  onDeleteTemplate,
  onTemplateUpdate,
  onAddTask,
  onDeleteTask,
  onTaskUpdate,
  onTasksReorder,
  dragDisabled,
  cardSize,
}, ref) {
  const [collapsedTemplates, setCollapsedTemplates] = useState<Set<string>>(new Set())

  // 从 localStorage 加载折叠状态
  useEffect(() => {
    setCollapsedTemplates(getCollapsedTemplates())
  }, [])

  const toggleCollapse = useCallback((templateId: string) => {
    setCollapsedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      saveCollapsedTemplates(next)
      return next
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = templates.findIndex((t) => t.id === active.id)
      const newIndex = templates.findIndex((t) => t.id === over.id)
      const newTemplates = arrayMove(templates, oldIndex, newIndex)
      await onReorder(newTemplates.map((t) => t.id))
    }
  }

  const collapseAll = useCallback(() => {
    const allIds = new Set(templates.map((t) => t.id))
    setCollapsedTemplates(allIds)
    saveCollapsedTemplates(allIds)
  }, [templates])

  const expandAll = useCallback(() => {
    const empty = new Set<string>()
    setCollapsedTemplates(empty)
    saveCollapsedTemplates(empty)
  }, [])

  useImperativeHandle(ref, () => ({ collapseAll, expandAll }), [collapseAll, expandAll])

  const templateIds = templates.map((t) => t.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={templateIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {templates.map((template) => (
            <SortableTemplateItem
              key={template.id}
              template={template}
              canEdit={canEdit}
              canApprove={canApprove}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              onDeleteTemplate={onDeleteTemplate}
              onTemplateUpdate={onTemplateUpdate}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onTaskUpdate={onTaskUpdate}
              onTasksReorder={onTasksReorder}
              disabled={!canEdit || !!dragDisabled}
              isCollapsed={collapsedTemplates.has(template.id)}
              onToggleCollapse={() => toggleCollapse(template.id)}
              cardSize={cardSize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
})
