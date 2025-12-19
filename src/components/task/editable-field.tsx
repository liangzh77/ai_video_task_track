'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface EditableFieldProps {
  value: string | number
  type?: 'text' | 'number' | 'date'
  onSave: (value: string | number) => Promise<void>
  disabled?: boolean
  prefix?: string
  suffix?: string
  placeholder?: string
  displayValue?: string  // 用于显示截断后的值
}

export function EditableField({
  value,
  type = 'text',
  onSave,
  disabled = false,
  prefix,
  suffix,
  placeholder = '-',
  displayValue,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(String(value ?? ''))
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (isLoading) return

    let newValue: string | number = editValue
    if (type === 'number') {
      newValue = Number(editValue) || 0
    }

    if (newValue === value) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onSave(newValue)
      setIsEditing(false)
    } catch (error) {
      console.error('保存失败:', error)
      setEditValue(String(value ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(String(value ?? ''))
      setIsEditing(false)
    }
  }

  // 计算要显示的值（优先使用 displayValue）
  const showValue = displayValue !== undefined ? displayValue : value

  if (disabled) {
    return (
      <span className="text-gray-900">
        {prefix}
        {showValue || placeholder}
        {suffix}
      </span>
    )
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="h-7 w-24 text-sm"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-gray-900 hover:bg-gray-100 px-1 py-0.5 rounded cursor-pointer transition-colors"
    >
      {prefix}
      {showValue || placeholder}
      {suffix}
    </button>
  )
}
