'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddTemplateButtonProps {
  onAdd: (name: string) => Promise<void>
}

export function AddTemplateButton({ onAdd }: AddTemplateButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await onAdd(name.trim())
      setName('')
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setError('')
    setIsAdding(false)
  }

  if (isAdding) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="模板名称"
          autoFocus
          className="w-48"
          disabled={isLoading}
        />
        <Button type="submit" size="sm" disabled={isLoading || !name.trim()}>
          {isLoading ? '添加中...' : '确认'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel} disabled={isLoading}>
          取消
        </Button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </form>
    )
  }

  return (
    <Button onClick={() => setIsAdding(true)} variant="outline">
      + 添加模板
    </Button>
  )
}
