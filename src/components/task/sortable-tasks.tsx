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
import { TaskRow } from './task-row'
import type { Task } from '@/types/api'

interface SortableTaskItemProps {
  task: Task
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (taskId: string) => Promise<void>
  disabled?: boolean
  cardSize?: number
}

function SortableTaskItem({
  task,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onTaskUpdate,
  onDeleteTask,
  disabled = false,
  cardSize,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      {/* Drag handle */}
      {canEdit && !disabled && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-grab active:cursor-grabbing bg-gray-50 hover:bg-gray-100 rounded-l border border-r-0 border-gray-200"
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
        <TaskRow
          task={task}
          canEdit={canEdit}
          canApprove={canApprove}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          onTaskUpdate={onTaskUpdate}
          onDelete={onDeleteTask}
          cardSize={cardSize}
        />
      </div>
    </div>
  )
}

interface SortableTasksProps {
  tasks: Task[]
  canEdit: boolean
  canApprove?: boolean
  currentUserId?: string
  currentUsername?: string
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (taskId: string) => Promise<void>
  onReorder: (taskIds: string[]) => Promise<void>
  dragDisabled?: boolean
  cardSize?: number
}

export function SortableTasks({
  tasks,
  canEdit,
  canApprove,
  currentUserId,
  currentUsername,
  onTaskUpdate,
  onDeleteTask,
  onReorder,
  dragDisabled,
  cardSize,
}: SortableTasksProps) {
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
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      await onReorder(newTasks.map((t) => t.id))
    }
  }

  const taskIds = tasks.map((t) => t.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              canEdit={canEdit}
              canApprove={canApprove}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              onTaskUpdate={onTaskUpdate}
              onDeleteTask={onDeleteTask}
              disabled={!canEdit || !!dragDisabled}
              cardSize={cardSize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
