import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DEFAULT_PASSWORD = '123456'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, username: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Don't allow resetting admin password
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: '不能重置管理员密码' }, { status: 403 })
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: '密码已重置为 123456' })
  } catch (error) {
    console.error('重置密码失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
