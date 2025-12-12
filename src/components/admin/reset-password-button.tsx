'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ResetPasswordButtonProps {
  userId: string
  username?: string
}

export function ResetPasswordButton({ userId }: ResetPasswordButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')

  const handleReset = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '重置密码失败')
      }

      setMessage('密码已重置为 123456')
      setShowConfirm(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '重置密码失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">确认重置?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReset}
          disabled={isLoading}
        >
          {isLoading ? '重置中...' : '确认'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfirm(false)}
          disabled={isLoading}
        >
          取消
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowConfirm(true)}
      >
        重置密码
      </Button>
      {message && (
        <span className={`text-xs ${message.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
