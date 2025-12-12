'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SortableTextProps {
  id: string
  text: string
  index: number
  onEdit: (index: number, text: string) => void
  onDelete: (index: number) => void
  disabled?: boolean
}

function SortableText({ id, text, index, onEdit, onDelete, disabled }: SortableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(text)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(index, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(text)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group"
    >
      {!disabled && (
        <span
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </span>
      )}

      {isEditing ? (
        <>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 h-8 text-sm"
          />
        </>
      ) : (
        <>
          <span
            className={`flex-1 text-sm px-2 py-1 bg-gray-50 rounded ${
              disabled ? '' : 'cursor-pointer hover:bg-gray-100'
            }`}
            onClick={() => !disabled && setIsEditing(true)}
          >
            {text}
          </span>
          {!disabled && (
            <button
              onClick={() => onDelete(index)}
              className="w-6 h-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  )
}

interface SortableCopyTextsProps {
  texts: string[]
  onUpdate: (texts: string[]) => void
  disabled?: boolean
}

export function SortableCopyTexts({ texts, onUpdate, disabled = false }: SortableCopyTextsProps) {
  const [newText, setNewText] = useState('')

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = texts.findIndex((_, i) => `text-${i}` === active.id)
      const newIndex = texts.findIndex((_, i) => `text-${i}` === over.id)
      const newTexts = arrayMove(texts, oldIndex, newIndex)
      onUpdate(newTexts)
    }
  }

  const handleEdit = (index: number, newValue: string) => {
    const newTexts = [...texts]
    newTexts[index] = newValue
    onUpdate(newTexts)
  }

  const handleDelete = (index: number) => {
    const newTexts = texts.filter((_, i) => i !== index)
    onUpdate(newTexts)
  }

  const handleAddText = () => {
    if (!newText.trim()) return
    onUpdate([...texts, newText.trim()])
    setNewText('')
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddText()
    }
  }

  const items = texts.map((_, i) => `text-${i}`)

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {texts.map((text, index) => (
            <SortableText
              key={`text-${index}`}
              id={`text-${index}`}
              text={text}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDelete}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="添加新文案..."
            className="flex-1 h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="h-8"
          >
            添加
          </Button>
        </div>
      )}
    </div>
  )
}
