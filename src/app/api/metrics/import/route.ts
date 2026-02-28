import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ImportCsvRequest } from '@/types/api'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // Check canCRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body: ImportCsvRequest = await request.json()
    const { date, data } = body

    if (!date || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: '数据格式错误' }, { status: 400 })
    }

    // 解析日期
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: '日期格式错误' }, { status: 400 })
    }

    // 获取所有有效的素材ID
    const materialIds = data.map(item => item.materialId).filter(id => id && id.trim())

    if (materialIds.length === 0) {
      return NextResponse.json({ error: '没有有效的素材ID' }, { status: 400 })
    }

    // 查找匹配的任务
    const tasks = await prisma.task.findMany({
      where: {
        materialId: {
          in: materialIds,
        },
      },
      select: {
        id: true,
        materialId: true,
      },
    })

    // 创建素材ID到任务ID的映射
    const materialIdToTaskId = new Map<string, string>()
    tasks.forEach(task => {
      if (task.materialId) {
        materialIdToTaskId.set(task.materialId, task.id)
      }
    })

    // 准备 upsert 操作
    const upsertPromises = data
      .filter(item => materialIdToTaskId.has(item.materialId))
      .map(item => {
        const taskId = materialIdToTaskId.get(item.materialId)!
        return prisma.dailyMetrics.upsert({
          where: {
            taskId_date: {
              taskId,
              date: dateObj,
            },
          },
          update: {
            cost: item.cost || 0,
            impressions: item.impressions || 0,
            clicks: item.clicks || 0,
            clickRate: item.clickRate || 0,
            cpm: item.cpm || 0,
            conversions: item.conversions || 0,
            conversionCost: item.conversionCost || 0,
            roi: item.roi || 0,
            activations: item.activations || 0,
            dailyPayment: item.dailyPayment || 0,
            materialScore: item.materialScore || 0,
          },
          create: {
            taskId,
            date: dateObj,
            cost: item.cost || 0,
            impressions: item.impressions || 0,
            clicks: item.clicks || 0,
            clickRate: item.clickRate || 0,
            cpm: item.cpm || 0,
            conversions: item.conversions || 0,
            conversionCost: item.conversionCost || 0,
            roi: item.roi || 0,
            activations: item.activations || 0,
            dailyPayment: item.dailyPayment || 0,
            materialScore: item.materialScore || 0,
          },
        })
      })

    await Promise.all(upsertPromises)

    const matchedCount = upsertPromises.length
    const unmatchedCount = data.length - matchedCount

    return NextResponse.json({
      success: true,
      matched: matchedCount,
      unmatched: unmatchedCount,
      message: `成功导入 ${matchedCount} 条数据${unmatchedCount > 0 ? `，${unmatchedCount} 条未匹配到任务` : ''}`,
    })
  } catch (error) {
    console.error('导入数据失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
