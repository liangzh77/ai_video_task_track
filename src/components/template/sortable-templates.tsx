'use client'

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

interface SortableTemplateItemProps {
  template: Template
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onDeleteTemplate: (templateId: string) => Promise<void>
  onAddTask: (templateId: string) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTasksReorder: (templateId: string, taskIds: string[]) => Promise<void>
  disabled?: boolean
}

function SortableTemplateItem({
  template,
  onImageClick,
  selectedImageUrl,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onDeleteTemplate,
  onAddTask,
  onDeleteTask,
  onTaskUpdate,
  onTasksReorder,
  disabled = false,
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

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-stretch gap-2">
        {/* Drag handle */}
        {canEdit && !disabled && (
          <div
            {...attributes}
            {...listeners}
            className="flex items-center px-2 cursor-grab active:cursor-grabbing bg-gray-100 hover:bg-gray-200 rounded-l-lg border border-r-0 border-gray-200"
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
            onImageClick={onImageClick}
            selectedImageUrl={selectedImageUrl}
            canEdit={canEdit}
            onDelete={onDeleteTemplate}
          />
        </div>
      </div>

      {template.tasks && template.tasks.length > 0 && (
        <div className="ml-6">
          <SortableTasks
            tasks={template.tasks}
            onImageClick={onImageClick}
            selectedImageUrl={selectedImageUrl}
            canEdit={canEdit}
            canApprove={canApprove}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            onTaskUpdate={onTaskUpdate}
            onDeleteTask={onDeleteTask}
            onReorder={(taskIds) => onTasksReorder(template.id, taskIds)}
          />
        </div>
      )}

      {canEdit && (
        <div className="ml-6">
          <AddTaskButton templateId={template.id} onAdd={onAddTask} />
        </div>
      )}
    </div>
  )
}

interface SortableTemplatesProps {
  templates: Template[]
  onImageClick: (url: string) => void
  selectedImageUrl: string | null
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onReorder: (templateIds: string[]) => Promise<void>
  onDeleteTemplate: (templateId: string) => Promise<void>
  onAddTask: (templateId: string) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTasksReorder: (templateId: string, taskIds: string[]) => Promise<void>
}

export function SortableTemplates({
  templates,
  onImageClick,
  selectedImageUrl,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onReorder,
  onDeleteTemplate,
  onAddTask,
  onDeleteTask,
  onTaskUpdate,
  onTasksReorder,
}: SortableTemplatesProps) {
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
              onImageClick={onImageClick}
              selectedImageUrl={selectedImageUrl}
              canEdit={canEdit}
              canApprove={canApprove}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              onDeleteTemplate={onDeleteTemplate}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onTaskUpdate={onTaskUpdate}
              onTasksReorder={onTasksReorder}
              disabled={!canEdit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
