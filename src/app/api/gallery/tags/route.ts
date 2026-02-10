import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // 查询所有标签，带使用计数
    const tags = await prisma.tag.findMany({
      where: search ? {
        name: { contains: search, mode: 'insensitive' },
      } : {},
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      itemCount: tag._count.items,
    }))

    return NextResponse.json({ tags: formattedTags })
  } catch (error) {
    console.error('获取标签列表失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
