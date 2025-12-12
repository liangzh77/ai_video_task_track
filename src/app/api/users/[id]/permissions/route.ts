import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
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
    const body = await request.json()
    const { canCRUD, canApprove } = body

    // Check if trying to modify admin user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: '不能修改管理员权限' }, { status: 403 })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof canCRUD === 'boolean' && { canCRUD }),
        ...(typeof canApprove === 'boolean' && { canApprove }),
      },
      select: {
        id: true,
        username: true,
        role: true,
        canCRUD: true,
        canApprove: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('更新权限失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
