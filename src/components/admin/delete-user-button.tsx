'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DeleteUserButtonProps {
  userId: string
  username: string
  onDeleted: () => void
}

export function DeleteUserButton({ userId, username, onDeleted }: DeleteUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '删除用户失败')
      }

      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除用户失败')
      setIsLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-600">删除 {username}?</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? '删除中...' : '确认'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowConfirm(false)
              setError('')
            }}
            disabled={isLoading}
          >
            取消
          </Button>
        </div>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => setShowConfirm(true)}
    >
      删除
    </Button>
  )
}
