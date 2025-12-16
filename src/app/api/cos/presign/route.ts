import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import crypto from 'crypto'

// COS 配置
const COS_CONFIG = {
  SecretId: process.env.TENCENT_COS_SECRET_ID || '',
  SecretKey: process.env.TENCENT_COS_SECRET_KEY || '',
  Region: process.env.TENCENT_COS_REGION || 'ap-beijing',
  Bucket: process.env.TENCENT_COS_BUCKET || 'xianban-feeds-1310472273',
}

// 生成 COS 签名
function generateSignature(
  method: string,
  key: string,
  expires: number = 600
): string {
  const now = Math.floor(Date.now() / 1000)
  const expireTime = now + expires
  const keyTime = `${now};${expireTime}`

  // 1. 生成 SignKey
  const signKey = crypto
    .createHmac('sha1', COS_CONFIG.SecretKey)
    .update(keyTime)
    .digest('hex')

  // 2. 生成 HttpString
  const httpString = `${method.toLowerCase()}\n/${key}\n\n\n`

  // 3. 生成 StringToSign
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  // 4. 生成 Signature
  const signature = crypto
    .createHmac('sha1', signKey)
    .update(stringToSign)
    .digest('hex')

  // 5. 生成最终签名字符串
  return `q-sign-algorithm=sha1&q-ak=${COS_CONFIG.SecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${signature}`
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 需要 CRUD 权限才能上传视频
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无上传权限' }, { status: 403 })
    }

    const body = await request.json()
    const { filename, contentType } = body

    if (!filename) {
      return NextResponse.json({ error: '文件名不能为空' }, { status: 400 })
    }

    // 生成唯一的文件路径
    const date = new Date().toISOString().split('T')[0]
    const ext = filename.split('.').pop() || 'mp4'
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const key = `videos/${date}/${uniqueId}.${ext}`

    // 生成签名
    const authorization = generateSignature('PUT', key)

    // 生成上传 URL
    const uploadUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`

    return NextResponse.json({
      uploadUrl,
      authorization,
      key,
      contentType: contentType || 'video/mp4',
    })
  } catch (error) {
    console.error('生成预签名 URL 失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
