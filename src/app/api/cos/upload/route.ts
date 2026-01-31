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

// 生成签名用于服务端上传
function generateAuthorization(
  method: string,
  key: string,
  contentType: string,
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

  // 2. 构建 HttpHeaders
  const headerList = 'content-type'
  const encodedContentType = encodeURIComponent(contentType)
  const httpHeaders = `content-type=${encodedContentType}`

  // 3. 生成 HttpString
  const httpString = `${method.toLowerCase()}\n/${key}\n\n${httpHeaders}\n`

  // 4. 生成 StringToSign
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`

  // 5. 生成 Signature
  const signature = crypto
    .createHmac('sha1', signKey)
    .update(stringToSign)
    .digest('hex')

  // 6. 构建 Authorization
  return `q-sign-algorithm=sha1&q-ak=${COS_CONFIG.SecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=${headerList}&q-url-param-list=&q-signature=${signature}`
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '文件不能为空' }, { status: 400 })
    }

    // 检查文件类型
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的视频格式' }, { status: 400 })
    }

    // 检查文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: '视频大小不能超过 100MB' }, { status: 400 })
    }

    // 生成唯一的文件路径
    const date = new Date().toISOString().split('T')[0]
    const ext = file.name.split('.').pop() || 'mp4'
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const key = `videos/${date}/${uniqueId}.${ext}`

    // 生成签名
    const authorization = generateAuthorization('PUT', key, file.type)

    // 上传到 COS
    const cosUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`
    const fileBuffer = await file.arrayBuffer()

    const uploadResponse = await fetch(cosUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Authorization': authorization,
      },
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('COS 上传失败:', errorText)
      return NextResponse.json({ error: '上传到 COS 失败' }, { status: 500 })
    }

    // 文件访问 URL
    const fileUrl = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`

    return NextResponse.json({
      url: fileUrl,
      key,
    })
  } catch (error) {
    console.error('视频上传失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
