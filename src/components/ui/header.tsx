'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from './button'
import { ChangePasswordDialog } from '@/components/user/change-password-dialog'

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // 判断当前页面是否为管理员页面
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-gray-900">任务跟踪系统</h1>
            {/* 当前页面指示 - 非管理员页面显示 */}
            {!isAdminPage && session?.user?.role !== 'ADMIN' && (
              <nav className="flex gap-1">
                {pathname === '/dashboard' && (
                  <Button variant="primary" size="sm">
                    任务
                  </Button>
                )}
                {pathname === '/gallery' && (
                  <Button variant="primary" size="sm">
                    作品墙
                  </Button>
                )}
              </nav>
            )}
          </div>
          {session?.user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600">
                {session.user.username}
                {session.user.role === 'ADMIN' && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    管理员
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChangePassword(true)}
              >
                修改密码
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                登出
              </Button>
            </div>
          )}
        </div>
      </header>

      <ChangePasswordDialog
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  )
}
