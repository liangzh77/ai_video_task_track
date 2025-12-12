'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

interface UserPermissionsProps {
  userId: string
  type: 'canCRUD' | 'canApprove'
  enabled: boolean
  disabled?: boolean
  onPermissionChange: (enabled: boolean) => void
}

export function UserPermissions({
  userId,
  type,
  enabled,
  disabled = false,
  onPermissionChange,
}: UserPermissionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = async (checked: boolean) => {
    if (isLoading || disabled) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type]: checked,
        }),
      })

      if (!response.ok) {
        throw new Error('更新权限失败')
      }

      onPermissionChange(checked)
    } catch (error) {
      console.error('更新权限失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Checkbox
      checked={enabled}
      onCheckedChange={handleChange}
      disabled={disabled || isLoading}
      className={isLoading ? 'opacity-50' : ''}
    />
  )
}
