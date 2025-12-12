import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Check CRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无编辑权限' }, { status: 403 })
    }

    const body = await request.json()
    const { templateId, orders } = body

    if (!templateId) {
      return NextResponse.json({ error: '模板 ID 不能为空' }, { status: 400 })
    }

    if (!Array.isArray(orders)) {
      return NextResponse.json({ error: '无效的排序数据' }, { status: 400 })
    }

    // Update all task orders in a transaction
    await prisma.$transaction(
      orders.map(({ id, order }: { id: string; order: number }) =>
        prisma.task.update({
          where: { id },
          data: { order },
        })
      )
    )

    return NextResponse.json({ message: '排序已更新' })
  } catch (error) {
    console.error('更新排序失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
