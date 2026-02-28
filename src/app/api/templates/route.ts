import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { MetricsSummary } from '@/types/api'

// 计算指标汇总
function calculateMetricsSummary(dailyMetrics: Array<{
  cost: number
  impressions: number
  clickRate: number
  cpm: number
  conversions: number
  roi: number
  activations: number
  dailyPayment: number
  materialScore: number
}>): MetricsSummary {
  if (dailyMetrics.length === 0) {
    return {
      totalCost: 0,
      totalImpressions: 0,
      avgClickRate: 0,
      avgCpm: 0,
      totalConversions: 0,
      avgRoi: 0,
      totalActivations: 0,
      totalDailyPayment: 0,
      avgMaterialScore: 0,
    }
  }

  const totalCost = dailyMetrics.reduce((sum, m) => sum + m.cost, 0)
  const totalImpressions = dailyMetrics.reduce((sum, m) => sum + m.impressions, 0)
  const totalConversions = dailyMetrics.reduce((sum, m) => sum + m.conversions, 0)
  const totalActivations = dailyMetrics.reduce((sum, m) => sum + m.activations, 0)
  const totalDailyPayment = dailyMetrics.reduce((sum, m) => sum + m.dailyPayment, 0)
  const avgClickRate = dailyMetrics.reduce((sum, m) => sum + m.clickRate, 0) / dailyMetrics.length
  const avgCpm = dailyMetrics.reduce((sum, m) => sum + m.cpm, 0) / dailyMetrics.length
  const avgMaterialScore = dailyMetrics.reduce((sum, m) => sum + m.materialScore, 0) / dailyMetrics.length
  // ROI 加权平均：sum(cost × roi) / sum(cost)
  const avgRoi = totalCost > 0
    ? dailyMetrics.reduce((sum, m) => sum + m.cost * m.roi, 0) / totalCost
    : 0

  return {
    totalCost,
    totalImpressions,
    avgClickRate,
    avgCpm,
    totalConversions,
    avgRoi,
    totalActivations,
    totalDailyPayment,
    avgMaterialScore,
  }
}

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
        },
      },
    })

    // 为每个任务计算指标汇总
    const templatesWithSummary = templates.map(template => ({
      ...template,
      tasks: template.tasks.map(task => ({
        ...task,
        metricsSummary: calculateMetricsSummary(task.dailyMetrics),
      })),
    }))

    return NextResponse.json(templatesWithSummary)
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

    // Check canCRUD permission
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { name, items = [] } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '模板名称不能为空' }, { status: 400 })
    }

    // Use transaction to reduce database round trips
    const template = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.template.aggregate({
        _max: { order: true },
      })

      return tx.template.create({
        data: {
          name: name.trim(),
          items: JSON.stringify(items),
          order: (maxOrder._max.order ?? -1) + 1,
        },
      })
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('创建模板失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
