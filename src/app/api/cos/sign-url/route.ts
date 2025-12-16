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

// 生成 GET 请求的签名 URL
function generateSignedGetUrl(key: string, expires: number = 600): string {
  const now = Math.floor(Date.now() / 1000)
  const expireTime = now + expires
  const keyTime = `${now};${expireTime}`

  // 1. 生成 SignKey
  const signKey = crypto
    .createHmac('sha1', COS_CONFIG.SecretKey)
    .update(keyTime)
    .digest('hex')

  // 2. 生成 HttpString (GET 请求不需要 headers)
  const httpString = `get\n/${key}\n\n\n`

  // 3. 生成 StringToSign
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  // 4. 生成 Signature
  const signature = crypto
    .createHmac('sha1', signKey)
    .update(stringToSign)
    .digest('hex')

  // 5. 构建签名 URL
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

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL 不能为空' }, { status: 400 })
    }

    // 从完整 URL 中提取 key
    // URL 格式: https://bucket.cos.region.myqcloud.com/key
    const urlObj = new URL(url)
    const key = urlObj.pathname.slice(1) // 移除开头的 /

    if (!key) {
      return NextResponse.json({ error: '无效的 URL' }, { status: 400 })
    }

    // 生成签名 URL（有效期 10 分钟）
    const signedUrl = generateSignedGetUrl(key, 600)

    return NextResponse.json({ signedUrl })
  } catch (error) {
    console.error('生成签名 URL 失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
