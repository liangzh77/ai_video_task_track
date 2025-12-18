import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { id } = await params

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            submitter: {
              select: {
                id: true,
                username: true,
              },
            },
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

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('获取模板失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Check CRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无编辑权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, items, videoUrl, notes, order } = body

    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json({ error: '模板名称不能为空' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (items !== undefined) {
      updateData.items = JSON.stringify(items)
    }
    if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (typeof order === 'number') {
      updateData.order = order
    }

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            submitter: {
              select: {
                id: true,
                username: true,
              },
            },
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

    return NextResponse.json(template)
  } catch (error) {
    console.error('更新模板失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Check CRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无删除权限' }, { status: 403 })
    }

    const { id } = await params

    // Delete template (cascade will delete tasks)
    await prisma.template.delete({
      where: { id },
    })

    return NextResponse.json({ message: '模板已删除' })
  } catch (error) {
    console.error('删除模板失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
