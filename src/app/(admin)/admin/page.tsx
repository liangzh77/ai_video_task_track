'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { UserPermissions } from '@/components/admin/user-permissions'
import { ResetPasswordButton } from '@/components/admin/reset-password-button'
import { DeleteUserButton } from '@/components/admin/delete-user-button'
import type { User } from '@/types/api'

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('获取用户列表失败')
      }
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handlePermissionChange = (userId: string, field: 'canCRUD' | 'canApprove' | 'canViewGallery', value: boolean) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, [field]: value } : user
    ))
  }

  const handleUserDeleted = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">用户名</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">角色</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">CRUD 权限</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">审批权限</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Gallery 权限</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">注册时间</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium">{user.username}</span>
                    </td>
                    <td className="py-3 px-4">
                      {user.role === 'ADMIN' ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          管理员
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          普通用户
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <UserPermissions
                        userId={user.id}
                        type="canCRUD"
                        enabled={user.canCRUD}
                        disabled={user.role === 'ADMIN'}
                        onPermissionChange={(value) =>
                          handlePermissionChange(user.id, 'canCRUD', value)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <UserPermissions
                        userId={user.id}
                        type="canApprove"
                        enabled={user.canApprove}
                        disabled={user.role === 'ADMIN'}
                        onPermissionChange={(value) =>
                          handlePermissionChange(user.id, 'canApprove', value)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <UserPermissions
                        userId={user.id}
                        type="canViewGallery"
                        enabled={user.canViewGallery}
                        disabled={user.role === 'ADMIN'}
                        onPermissionChange={(value) =>
                          handlePermissionChange(user.id, 'canViewGallery', value)
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.role !== 'ADMIN' && (
                        <div className="flex items-center justify-center gap-2">
                          <ResetPasswordButton userId={user.id} username={user.username} />
                          <DeleteUserButton
                            userId={user.id}
                            username={user.username}
                            onDeleted={() => handleUserDeleted(user.id)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
