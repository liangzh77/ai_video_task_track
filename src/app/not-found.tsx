import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">页面未找到</h2>
        <p className="text-gray-600 mb-6">
          您访问的页面不存在或已被移除。
        </p>
        <Link href="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    </div>
  )
}
