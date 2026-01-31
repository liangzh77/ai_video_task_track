import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 获取所有有作品的创作者
    const creators = await prisma.user.findMany({
      where: {
        galleryItems: {
          some: {},
        },
      },
      select: {
        id: true,
        username: true,
        _count: {
          select: { galleryItems: true },
        },
      },
      orderBy: {
        username: 'asc',
      },
    })

    return NextResponse.json({
      creators: creators.map(c => ({
        id: c.id,
        username: c.username,
        itemCount: c._count.galleryItems,
      })),
    })
  } catch (error) {
    console.error('获取创作者列表失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
