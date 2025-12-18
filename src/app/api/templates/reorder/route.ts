import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
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
    const { templateIds } = body

    if (!Array.isArray(templateIds)) {
      return NextResponse.json({ error: '无效的排序数据' }, { status: 400 })
    }

    // Update all template orders in a transaction
    await prisma.$transaction(
      templateIds.map((id: string, index: number) =>
        prisma.template.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ message: '排序已更新' })
  } catch (error) {
    console.error('更新排序失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
