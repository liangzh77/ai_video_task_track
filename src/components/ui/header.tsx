'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button } from './button'

export function Header() {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">任务跟踪系统</h1>
        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.username}
              {session.user.role === 'ADMIN' && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  管理员
                </span>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              登出
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
