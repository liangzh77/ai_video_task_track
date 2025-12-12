'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AddTaskButtonProps {
  templateId: string
  onAdd: (templateId: string) => Promise<void>
}

export function AddTaskButton({ templateId, onAdd }: AddTaskButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onAdd(templateId)
    } catch (error) {
      console.error('添加任务失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      disabled={isLoading}
      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
    >
      {isLoading ? '添加中...' : '+ 添加任务'}
    </Button>
  )
}
