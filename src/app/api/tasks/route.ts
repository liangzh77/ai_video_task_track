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
      items = [],
      materialId = '',
      notes = '',
      publishDate,
      exposure = 0,
      registrations = 0,
      profit = 0,
    } = body

    if (!templateId) {
      return NextResponse.json({ error: '模板 ID 不能为空' }, { status: 400 })
    }

    // Use transaction to reduce database round trips
    const task = await prisma.$transaction(async (tx) => {
      // Check if template exists
      const template = await tx.template.findUnique({
        where: { id: templateId },
        select: { id: true },
      })

      if (!template) {
        throw new Error('TEMPLATE_NOT_FOUND')
      }

      // Get max order for this template
      const maxOrder = await tx.task.aggregate({
        where: { templateId },
        _max: { order: true },
      })

      return tx.task.create({
        data: {
          templateId,
          items: JSON.stringify(items),
          materialId,
          notes,
          publishDate: publishDate ? new Date(publishDate) : null,
          exposure,
          registrations,
          profit,
          order: (maxOrder._max.order ?? -1) + 1,
          // creatorId 留空，用户可以通过"制作"按钮认领
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
    }).catch((error) => {
      if (error.message === 'TEMPLATE_NOT_FOUND') {
        return null
      }
      throw error
    })

    if (!task) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
