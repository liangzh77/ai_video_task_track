import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { GalleryItem } from '@/types/api'

// 转换数据库结果为 API 响应格式
function formatGalleryItem(item: {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  sourceUrl: string | null
  sourceType: 'IMAGE' | 'VIDEO' | null
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
    sourceUrl: item.sourceUrl,
    sourceType: item.sourceType,
    prompt: item.prompt,
    creator: item.creator,
    tags: item.tags.map(t => ({ id: t.tag.id, name: t.tag.name })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { id } = await params

    const item = await prisma.galleryItem.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 })
    }

    return NextResponse.json(formatGalleryItem(item))
  } catch (error) {
    console.error('获取作品失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查 canCRUD 权限
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { prompt, tags, sourceUrl, sourceType, url, type } = body

    // 检查作品是否存在
    const existing = await prisma.galleryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 })
    }

    // 验证 sourceType（如果提供）
    if (sourceType !== undefined && sourceType !== null && !['IMAGE', 'VIDEO'].includes(sourceType)) {
      return NextResponse.json({ error: '原始素材类型无效' }, { status: 400 })
    }

    // 验证 type（如果提供）
    if (type !== undefined && !['IMAGE', 'VIDEO'].includes(type)) {
      return NextResponse.json({ error: '类型无效' }, { status: 400 })
    }

    // 使用事务更新作品和标签
    const item = await prisma.$transaction(async (tx) => {
      // 更新基本信息
      const updateData: {
        prompt?: string
        sourceUrl?: string | null
        sourceType?: 'IMAGE' | 'VIDEO' | null
        url?: string
        type?: 'IMAGE' | 'VIDEO'
      } = {}
      if (prompt !== undefined) {
        updateData.prompt = prompt
      }
      if (sourceUrl !== undefined) {
        updateData.sourceUrl = sourceUrl
      }
      if (sourceType !== undefined) {
        updateData.sourceType = sourceType
      }
      if (url !== undefined) {
        updateData.url = url
      }
      if (type !== undefined) {
        updateData.type = type
      }

      if (Object.keys(updateData).length > 0) {
        await tx.galleryItem.update({
          where: { id },
          data: updateData,
        })
      }

      // 更新标签
      if (tags !== undefined) {
        // 删除现有标签关联
        await tx.galleryItemTag.deleteMany({
          where: { galleryItemId: id },
        })

        // 添加新标签
        for (const tagName of tags) {
          const trimmedName = tagName.trim()
          if (!trimmedName) continue

          const tag = await tx.tag.upsert({
            where: { name: trimmedName },
            update: {},
            create: { name: trimmedName },
          })

          await tx.galleryItemTag.create({
            data: {
              galleryItemId: id,
              tagId: tag.id,
            },
          })
        }
      }

      // 返回更新后的数据
      return tx.galleryItem.findUnique({
        where: { id },
        include: {
          creator: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
      })
    })

    if (!item) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json(formatGalleryItem(item))
  } catch (error) {
    console.error('更新作品失败:', error)
    const errorMessage = error instanceof Error ? error.message : '服务器错误'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查 canCRUD 权限
    if (!session.user.canCRUD && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params

    // 检查作品是否存在
    const existing = await prisma.galleryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 })
    }

    // 删除作品（标签关联会级联删除）
    await prisma.galleryItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除作品失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
