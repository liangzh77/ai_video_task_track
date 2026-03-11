import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// Vercel serverless 超时设置（秒）- 下载+转发视频需要较长时间
export const maxDuration = 60

const BRIDGE_API_URL = process.env.BRIDGE_API_URL || 'http://82.157.178.120:9999/api/open'

const COS_CONFIG = {
  SecretId: process.env.TENCENT_COS_SECRET_ID || '',
  SecretKey: process.env.TENCENT_COS_SECRET_KEY || '',
  Region: process.env.TENCENT_COS_REGION || 'ap-beijing',
  Bucket: process.env.TENCENT_COS_BUCKET || 'xianban-feeds-1310472273',
}

function generateSignedGetUrl(key: string, expires: number = 600): string {
  const now = Math.floor(Date.now() / 1000)
  const expireTime = now + expires
  const keyTime = `${now};${expireTime}`

  const signKey = crypto
    .createHmac('sha1', COS_CONFIG.SecretKey)
    .update(keyTime)
    .digest('hex')

  const httpString = `get\n/${key}\n\n\n`
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  const signature = crypto
    .createHmac('sha1', signKey)
    .update(stringToSign)
    .digest('hex')

  const baseUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`
  const queryString = `q-sign-algorithm=sha1&q-ak=${COS_CONFIG.SecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${signature}`

  return `${baseUrl}?${queryString}`
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { type, id } = await request.json()

    if (!type || !id || !['template', 'task'].includes(type)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    // 查询记录
    let videoUrl: string | null = null
    let bridgeUploaded = false

    if (type === 'template') {
      const template = await prisma.template.findUnique({ where: { id } })
      if (!template) return NextResponse.json({ error: '模板不存在' }, { status: 404 })
      videoUrl = template.videoUrl
      bridgeUploaded = template.bridgeUploaded
    } else {
      const task = await prisma.task.findUnique({ where: { id } })
      if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 })
      videoUrl = task.videoUrl
      bridgeUploaded = task.bridgeUploaded
    }

    if (!videoUrl) {
      return NextResponse.json({ error: '没有视频' }, { status: 400 })
    }

    if (bridgeUploaded) {
      return NextResponse.json({ error: '已上传过' }, { status: 409 })
    }

    // 从 COS 下载视频
    const urlObj = new URL(videoUrl)
    const key = urlObj.pathname.slice(1)
    const signedUrl = generateSignedGetUrl(key, 600)

    const videoResponse = await fetch(signedUrl)
    if (!videoResponse.ok) {
      return NextResponse.json({ error: '下载视频失败' }, { status: 500 })
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
    const fileName = key.split('/').pop() || 'video.mp4'

    // 上传到 Bridge API
    const tags = type === 'template' ? '["爆改-原版"]' : '["爆改-待后期"]'

    const formData = new FormData()
    formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), fileName)
    formData.append('tags', tags)
    formData.append('created_by', '勇')

    const bridgeResponse = await fetch(`${BRIDGE_API_URL}/videos/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!bridgeResponse.ok) {
      const errData = await bridgeResponse.json().catch(() => ({}))
      // 409 = 文件已存在（相同 hash），也算上传成功
      if (bridgeResponse.status !== 409) {
        return NextResponse.json(
          { error: errData.message || '上传到桥段素材库失败' },
          { status: bridgeResponse.status }
        )
      }
    }

    // 更新数据库
    if (type === 'template') {
      await prisma.template.update({ where: { id }, data: { bridgeUploaded: true } })
    } else {
      await prisma.task.update({ where: { id }, data: { bridgeUploaded: true } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bridge 上传失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
