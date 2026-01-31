import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
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

    // Don't allow deleting admin
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: '不能删除管理员账户' }, { status: 403 })
    }

    // Delete user (related data will be handled by Prisma cascade or set null)
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: '用户已删除' })
  } catch (error) {
    console.error('删除用户失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
