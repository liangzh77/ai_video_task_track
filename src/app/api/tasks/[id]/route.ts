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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        template: true,
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('获取任务失败:', error)
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

    const { id } = await params
    const body = await request.json()

    const {
      items,
      materialId,
      notes,
      isApproved,
      claimCreator,
      removeCreator,
      publishDate,
      exposure,
      registrations,
      profit,
      order,
    } = body

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const canCRUD = session.user.canCRUD || isAdmin
    const canApprove = session.user.canApprove || isAdmin

    // Check permissions based on what's being updated
    const isUpdatingCRUDFields = items !== undefined || materialId !== undefined ||
      notes !== undefined || publishDate !== undefined || exposure !== undefined ||
      registrations !== undefined || profit !== undefined || order !== undefined

    const isUpdatingApproveFields = typeof isApproved === 'boolean' ||
      claimCreator === true || removeCreator === true

    // If updating CRUD fields, need canCRUD permission
    if (isUpdatingCRUDFields && !canCRUD) {
      return NextResponse.json({ error: '无编辑权限' }, { status: 403 })
    }

    // If only updating approve fields, need canApprove permission
    if (!isUpdatingCRUDFields && isUpdatingApproveFields && !canApprove) {
      return NextResponse.json({ error: '无审批权限' }, { status: 403 })
    }

    // If user has neither permission, reject
    if (!canCRUD && !canApprove) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    // Only users with canApprove can change approval status
    if (typeof isApproved === 'boolean' && !canApprove) {
      return NextResponse.json({ error: '无审批权限' }, { status: 403 })
    }

    // Only creator or users with canApprove can remove creator
    if (removeCreator === true) {
      const isCreator = existingTask.creatorId === session.user.id
      if (!isCreator && !canApprove) {
        return NextResponse.json({ error: '无权移除制作人' }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = {}

    if (items !== undefined) {
      updateData.items = JSON.stringify(items)
    }
    if (materialId !== undefined) {
      updateData.materialId = materialId
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (typeof isApproved === 'boolean') {
      updateData.isApproved = isApproved
    }
    if (claimCreator === true) {
      updateData.creatorId = session.user.id
    }
    if (removeCreator === true) {
      updateData.creatorId = null
    }
    if (publishDate !== undefined) {
      updateData.publishDate = publishDate ? new Date(publishDate) : null
    }
    if (typeof exposure === 'number') {
      updateData.exposure = exposure
    }
    if (typeof registrations === 'number') {
      updateData.registrations = registrations
    }
    if (typeof profit === 'number') {
      updateData.profit = profit
    }
    if (typeof order === 'number') {
      updateData.order = order
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('更新任务失败:', error)
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

    // Check if user has CRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无删除权限' }, { status: 403 })
    }

    const { id } = await params

    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ message: '任务已删除' })
  } catch (error) {
    console.error('删除任务失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
