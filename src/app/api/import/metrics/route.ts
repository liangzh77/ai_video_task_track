import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
}

function jsonResponse(data: unknown, status: number = 200) {
  return new NextResponse(JSON.stringify(data), { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function authenticateRequest(request: Request): Promise<{ authenticated: boolean; error?: string }> {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.IMPORT_API_KEY
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authenticated: true }
  }

  const session = await auth()
  if (session?.user && (session.user.canCRUD || session.user.role === 'ADMIN')) {
    return { authenticated: true }
  }

  if (session?.user) {
    return { authenticated: false, error: '无导入权限' }
  }

  return { authenticated: false, error: '未授权，请提供有效的 x-api-key 或登录' }
}

interface DailyData {
  date: string
  cost?: number
  roi?: number
  impressions?: number
  cpm?: number
  clicks?: number
  ctr?: number
  cpc?: number
  conversions?: number
  cvr?: number
  cpa?: number
}

interface VideoData {
  video_id: number
  ocean_video_ids: string[]
  daily: DailyData[]
}

interface RequestBody {
  sync_time: string
  videos: VideoData[]
}

export async function POST(request: Request) {
  try {
    const { authenticated, error } = await authenticateRequest(request)
    if (!authenticated) {
      return jsonResponse({ error }, 401)
    }

    const body: RequestBody = await request.json()
    const { videos } = body

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return jsonResponse({ error: '数据格式错误，videos 不能为空' }, 400)
    }

    // 收集所有 ocean_video_ids
    const allOceanIds: string[] = []
    for (const video of videos) {
      if (video.ocean_video_ids) {
        allOceanIds.push(...video.ocean_video_ids)
      }
    }

    if (allOceanIds.length === 0) {
      return jsonResponse({ error: '没有有效的 ocean_video_ids' }, 400)
    }

    // 查找匹配的任务（ocean_video_id → Task.materialId）
    const tasks = await prisma.task.findMany({
      where: {
        materialId: { in: allOceanIds },
      },
      select: { id: true, materialId: true },
    })

    const materialIdToTaskId = new Map<string, string>()
    for (const task of tasks) {
      if (task.materialId) {
        materialIdToTaskId.set(task.materialId, task.id)
      }
    }

    // 准备 upsert 操作
    let matchedVideos = 0
    let unmatchedVideos = 0
    let totalMetrics = 0
    const upsertPromises: Promise<unknown>[] = []

    for (const video of videos) {
      // 找到该视频匹配的 taskIds
      const matchedTaskIds: string[] = []
      for (const oceanId of (video.ocean_video_ids || [])) {
        const taskId = materialIdToTaskId.get(oceanId)
        if (taskId) matchedTaskIds.push(taskId)
      }

      if (matchedTaskIds.length === 0) {
        unmatchedVideos++
        continue
      }

      matchedVideos++

      // 为每个匹配的 task 和每天的数据创建 upsert
      for (const taskId of matchedTaskIds) {
        for (const day of (video.daily || [])) {
          const dateObj = new Date(day.date)
          if (isNaN(dateObj.getTime())) continue

          totalMetrics++
          upsertPromises.push(
            prisma.dailyMetrics.upsert({
              where: { taskId_date: { taskId, date: dateObj } },
              update: {
                cost: day.cost || 0,
                impressions: day.impressions || 0,
                clicks: day.clicks || 0,
                clickRate: day.ctr || 0,
                cpm: day.cpm || 0,
                conversions: day.conversions || 0,
                conversionCost: day.cpa || 0,
                roi: day.roi || 0,
              },
              create: {
                taskId,
                date: dateObj,
                cost: day.cost || 0,
                impressions: day.impressions || 0,
                clicks: day.clicks || 0,
                clickRate: day.ctr || 0,
                cpm: day.cpm || 0,
                conversions: day.conversions || 0,
                conversionCost: day.cpa || 0,
                roi: day.roi || 0,
              },
            })
          )
        }
      }
    }

    await Promise.all(upsertPromises)

    return jsonResponse({
      success: true,
      message: `成功接收 ${matchedVideos} 个视频的投放数据` +
        (unmatchedVideos > 0 ? `，${unmatchedVideos} 个视频未匹配到任务` : ''),
      matched: matchedVideos,
      unmatched: unmatchedVideos,
      metrics_upserted: totalMetrics,
    })
  } catch (error) {
    console.error('指标导入失败:', error)
    return jsonResponse({ error: '服务器错误' }, 500)
  }
}
