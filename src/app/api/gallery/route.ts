import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { GalleryItem, GalleryListResponse } from '@/types/api'

// 转换数据库结果为 API 响应格式
function formatGalleryItem(item: {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  prompt: string
  createdAt: Date
  updatedAt: Date
  creator: { id: string; username: string } | null
  tags: Array<{ tag: { id: string; name: string } }>
}): GalleryItem {
  return {
    id: item.id,
    type: item.type,
    url: item.url,
    prompt: item.prompt,
    creator: item.creator,
    tags: item.tags.map(t => ({ id: t.tag.id, name: t.tag.name })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tagsParam = searchParams.get('tags') || ''
    const typeParam = searchParams.get('type') as 'IMAGE' | 'VIDEO' | null
    const creatorId = searchParams.get('creatorId') || ''
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : []

    // 构建查询条件
    const where = {
      AND: [
        search ? { prompt: { contains: search, mode: 'insensitive' as const } } : {},
        tags.length > 0 ? { tags: { some: { tag: { name: { in: tags } } } } } : {},
        typeParam ? { type: typeParam } : {},
        creatorId ? { creatorId } : {},
      ],
    }

    // 并行查询总数和数据
    const [total, items] = await Promise.all([
      prisma.galleryItem.count({ where }),
      prisma.galleryItem.findMany({
        where,
        include: {
          creator: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const response: GalleryListResponse = {
      items: items.map(formatGalleryItem),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取作品列表失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查 canCRUD 权限
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { type, url, prompt = '', tags = [] } = body

    if (!type || !['IMAGE', 'VIDEO'].includes(type)) {
      return NextResponse.json({ error: '类型无效' }, { status: 400 })
    }

    if (!url) {
      return NextResponse.json({ error: 'URL 不能为空' }, { status: 400 })
    }

    // 使用事务创建作品和标签关联
    const item = await prisma.$transaction(async (tx) => {
      // 创建作品
      const galleryItem = await tx.galleryItem.create({
        data: {
          type,
          url,
          prompt,
          creatorId: session.user.id,
        },
      })

      // 处理标签
      if (tags.length > 0) {
        for (const tagName of tags) {
          const trimmedName = tagName.trim()
          if (!trimmedName) continue

          // 创建或获取标签
          const tag = await tx.tag.upsert({
            where: { name: trimmedName },
            update: {},
            create: { name: trimmedName },
          })

          // 创建关联
          await tx.galleryItemTag.create({
            data: {
              galleryItemId: galleryItem.id,
              tagId: tag.id,
            },
          })
        }
      }

      // 返回完整数据
      return tx.galleryItem.findUnique({
        where: { id: galleryItem.id },
        include: {
          creator: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
      })
    })

    if (!item) {
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    return NextResponse.json(formatGalleryItem(item), { status: 201 })
  } catch (error) {
    console.error('创建作品失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
