'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CopyTextListProps {
  texts: string[]
  onUpdate: (texts: string[]) => void
  disabled?: boolean
}

export function CopyTextList({ texts, onUpdate, disabled = false }: CopyTextListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newText, setNewText] = useState('')

  const handleStartEdit = (index: number) => {
    if (disabled) return
    setEditingIndex(index)
    setEditValue(texts[index])
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return

    const newTexts = [...texts]
    if (editValue.trim()) {
      newTexts[editingIndex] = editValue.trim()
    } else {
      newTexts.splice(editingIndex, 1)
    }
    onUpdate(newTexts)
    setEditingIndex(null)
    setEditValue('')
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
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

  const handleDelete = (index: number) => {
    const newTexts = texts.filter((_, i) => i !== index)
    onUpdate(newTexts)
  }

  return (
    <div className="space-y-2">
      {texts.map((text, index) => (
        <div key={index} className="flex items-center gap-2 group">
          {editingIndex === index ? (
            <>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-8 px-2"
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <span
                className={`flex-1 text-sm px-2 py-1 bg-gray-50 rounded ${
                  disabled ? '' : 'cursor-pointer hover:bg-gray-100'
                }`}
                onClick={() => handleStartEdit(index)}
              >
                {text}
              </span>
              {!disabled && (
                <button
                  onClick={() => handleDelete(index)}
                  className="w-6 h-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                >
                  ×
                </button>
              )}
            </>
          )}
        </div>
      ))}

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
