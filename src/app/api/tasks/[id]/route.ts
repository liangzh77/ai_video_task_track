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
      videoUrl,
      materialId,
      notes,
      feedback,
      claimSubmitter,
      removeSubmitter,
      isApproved,
      claimCreator,
      removeCreator,
      order,
      clearMetrics,
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
    const isUpdatingCRUDFields = items !== undefined || videoUrl !== undefined ||
      materialId !== undefined || notes !== undefined || feedback !== undefined ||
      order !== undefined || clearMetrics === true

    const isUpdatingApproveFields = typeof isApproved === 'boolean' ||
      claimSubmitter === true || removeSubmitter === true ||
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

    // Only submitter or users with canApprove can remove submitter
    if (removeSubmitter === true) {
      const isSubmitter = existingTask.submitterId === session.user.id
      if (!isSubmitter && !canApprove) {
        return NextResponse.json({ error: '无权移除提交者' }, { status: 403 })
      }
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
    if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl
    }
    if (materialId !== undefined) {
      // 去掉前后的空格和制表符
      updateData.materialId = typeof materialId === 'string' ? materialId.trim() : materialId
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (feedback !== undefined) {
      updateData.feedback = feedback
    }
    if (claimSubmitter === true) {
      updateData.submitterId = session.user.id
    }
    if (removeSubmitter === true) {
      updateData.submitterId = null
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
    if (typeof order === 'number') {
      updateData.order = order
    }

    // Clear metrics if requested
    if (clearMetrics === true) {
      await prisma.dailyMetrics.deleteMany({
        where: { taskId: id },
      })
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
        dailyMetrics: {
          orderBy: { date: 'desc' },
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
