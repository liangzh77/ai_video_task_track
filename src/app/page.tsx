import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">任务跟踪系统</h1>
        <p className="text-gray-600 mb-8">
          管理您的模板和任务，追踪工作进度
        </p>
        <div className="space-x-4">
          <Link href="/login">
            <Button>登录</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">注册</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
