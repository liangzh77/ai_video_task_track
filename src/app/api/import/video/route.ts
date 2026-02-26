import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// COS 配置
const COS_CONFIG = {
  SecretId: process.env.TENCENT_COS_SECRET_ID || '',
  SecretKey: process.env.TENCENT_COS_SECRET_KEY || '',
  Region: process.env.TENCENT_COS_REGION || 'ap-beijing',
  Bucket: process.env.TENCENT_COS_BUCKET || 'xianban-feeds-1310472273',
}

function generateAuthorization(
  method: string,
  key: string,
  contentType: string,
  expires: number = 600
): string {
  const now = Math.floor(Date.now() / 1000)
  const expireTime = now + expires
  const keyTime = `${now};${expireTime}`

  const signKey = crypto
    .createHmac('sha1', COS_CONFIG.SecretKey)
    .update(keyTime)
    .digest('hex')

  const headerList = 'content-type'
  const encodedContentType = encodeURIComponent(contentType)
  const httpHeaders = `content-type=${encodedContentType}`

  const httpString = `${method.toLowerCase()}\n/${key}\n\n${httpHeaders}\n`
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  const signature = crypto
    .createHmac('sha1', signKey)
    .update(stringToSign)
    .digest('hex')

  return `q-sign-algorithm=sha1&q-ak=${COS_CONFIG.SecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=${headerList}&q-url-param-list=&q-signature=${signature}`
}

/**
 * 验证请求认证：支持 session 登录或 API Key
 * API Key 通过 x-api-key 头传递，对应环境变量 IMPORT_API_KEY
 */
async function authenticateRequest(request: Request): Promise<{ authenticated: boolean; error?: string }> {
  // 1. 尝试 API Key 认证
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.IMPORT_API_KEY
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authenticated: true }
  }

  // 2. 尝试 session 认证
  const session = await auth()
  if (session?.user && (session.user.canCRUD || session.user.role === 'ADMIN')) {
    return { authenticated: true }
  }

  if (session?.user) {
    return { authenticated: false, error: '无导入权限' }
  }

  return { authenticated: false, error: '未授权，请提供有效的 x-api-key 或登录' }
}

export async function POST(request: Request) {
  try {
    const { authenticated, error } = await authenticateRequest(request)
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string | null
    const notes = formData.get('notes') as string | null
    const video = formData.get('video') as File | null
    const videoUrl = formData.get('videoUrl') as string | null

    // 校验必填字段
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '模板名称(name)不能为空' }, { status: 400 })
    }

    if (!video && !videoUrl) {
      return NextResponse.json({ error: '请提供视频文件(video)或视频链接(videoUrl)' }, { status: 400 })
    }

    let finalVideoUrl = videoUrl || ''

    // 如果上传了视频文件，先传到 COS
    if (video) {
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
      if (!validTypes.includes(video.type)) {
        return NextResponse.json(
          { error: `不支持的视频格式: ${video.type}，支持 mp4/webm/mov/avi` },
          { status: 400 }
        )
      }

      if (video.size > 100 * 1024 * 1024) {
        return NextResponse.json({ error: '视频大小不能超过 100MB' }, { status: 400 })
      }

      const date = new Date().toISOString().split('T')[0]
      const ext = video.name.split('.').pop() || 'mp4'
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      const key = `videos/${date}/${uniqueId}.${ext}`

      const authorization = generateAuthorization('PUT', key, video.type)
      const cosUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`
      const fileBuffer = await video.arrayBuffer()

      const uploadResponse = await fetch(cosUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': video.type,
          'Authorization': authorization,
        },
        body: fileBuffer,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('COS 上传失败:', errorText)
        return NextResponse.json({ error: '视频上传到 COS 失败' }, { status: 500 })
      }

      finalVideoUrl = cosUrl
    }

    // 创建模板
    const template = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.template.aggregate({
        _max: { order: true },
      })

      return tx.template.create({
        data: {
          name: name.trim(),
          notes: notes?.trim() || '',
          videoUrl: finalVideoUrl,
          items: JSON.stringify([]),
          order: (maxOrder._max.order ?? -1) + 1,
        },
      })
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        notes: template.notes,
        videoUrl: template.videoUrl,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('视频导入失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
