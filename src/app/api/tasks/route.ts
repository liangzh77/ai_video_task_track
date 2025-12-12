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
      return NextResponse.json({ error: '无创建权限' }, { status: 403 })
    }

    const body = await request.json()
    const {
      templateId,
      images = [],
      copyTexts = [],
      notes = '',
      publishDate,
      exposure = 0,
      registrations = 0,
      profit = 0,
    } = body

    if (!templateId) {
      return NextResponse.json({ error: '模板 ID 不能为空' }, { status: 400 })
    }

    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    // Get max order for this template
    const maxOrder = await prisma.task.aggregate({
      where: { templateId },
      _max: { order: true },
    })

    const task = await prisma.task.create({
      data: {
        templateId,
        images: JSON.stringify(images),
        copyTexts: JSON.stringify(copyTexts),
        notes,
        publishDate: publishDate ? new Date(publishDate) : null,
        exposure,
        registrations,
        profit,
        order: (maxOrder._max.order ?? -1) + 1,
        creatorId: session.user.id, // Auto-assign creator
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
