import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Admin should not access this endpoint (they use /admin routes)
    if (session.user.role === 'ADMIN') {
      return NextResponse.json({ error: '管理员请使用管理员界面' }, { status: 403 })
    }

    const templates = await prisma.template.findMany({
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('获取模板列表失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Only admin can create templates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { name, images = [], copyTexts = [] } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '模板名称不能为空' }, { status: 400 })
    }

    // Get max order
    const maxOrder = await prisma.template.aggregate({
      _max: { order: true },
    })

    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        images: JSON.stringify(images),
        copyTexts: JSON.stringify(copyTexts),
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('创建模板失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
