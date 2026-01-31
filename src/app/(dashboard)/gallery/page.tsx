'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { GalleryGrid } from '@/components/gallery/gallery-grid'
import { GalleryFilter, type Creator, type SortOrder } from '@/components/gallery/gallery-filter'
import { GalleryCardModal } from '@/components/gallery/gallery-card-modal'
import { GalleryLightbox } from '@/components/gallery/gallery-lightbox'
import type { GalleryItem, GalleryListResponse, MediaType, Tag, CreateGalleryItemRequest, UpdateGalleryItemRequest } from '@/types/api'

export default function GalleryPage() {
  const { data: session, status } = useSession()
  const canViewGallery = session?.user?.canViewGallery || session?.user?.role === 'ADMIN' || false
  const canEdit = session?.user?.canCRUD || session?.user?.role === 'ADMIN' || false

  // 数据状态
  const [items, setItems] = useState<GalleryItem[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 筛选状态
  const [searchText, setSearchText] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<MediaType | null>(null)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | undefined>(undefined)

  // Lightbox 状态
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null)
  const [lightboxPlayableUrl, setLightboxPlayableUrl] = useState<string | null>(null)

  // 列数状态 (从 localStorage 读取，默认 6 列)
  const [columns, setColumns] = useState(6)

  // 初始化列数从 localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gallery-columns')
    if (saved) {
      const num = parseInt(saved, 10)
      if (num >= 2 && num <= 10) {
        setColumns(num)
      }
    }
  }, [])

  // 调整列数
  const adjustColumns = (delta: number) => {
    setColumns(prev => {
      const next = Math.min(10, Math.max(2, prev + delta))
      localStorage.setItem('gallery-columns', next.toString())
      return next
    })
  }

  // 加载标签
  const loadTags = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data.tags)
      }
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  }, [])

  // 加载创作者
  const loadCreators = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery/creators')
      if (res.ok) {
        const data = await res.json()
        setCreators(data.creators)
      }
    } catch (error) {
      console.error('加载创作者失败:', error)
    }
  }, [])

  // 加载作品列表
  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (selectedType) params.append('type', selectedType)
      if (selectedCreatorId) params.append('creatorId', selectedCreatorId)
      params.append('sortOrder', sortOrder)
      params.append('page', page.toString())
      params.append('limit', '24')

      const res = await fetch(`/api/gallery?${params}`)
      if (res.ok) {
        const data: GalleryListResponse = await res.json()
        setItems(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('加载作品列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchText, selectedTags, selectedType, selectedCreatorId, sortOrder, page])

  // 初始加载
  useEffect(() => {
    loadTags()
    loadCreators()
  }, [loadTags, loadCreators])

  // 筛选变化时重新加载
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // 打开创建弹窗
  const handleCreate = () => {
    setEditingItem(undefined)
    setIsModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  // 关闭弹窗
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(undefined)
  }

  // 保存作品
  const handleSave = async (data: CreateGalleryItemRequest | UpdateGalleryItemRequest) => {
    if (editingItem) {
      // 更新
      const res = await fetch(`/api/gallery/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '更新失败')
      }
    } else {
      // 创建
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '创建失败')
      }
    }

    // 刷新数据
    await loadItems()
    await loadTags()
    await loadCreators()
  }

  // 删除作品
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadItems()
        await loadTags()
        await loadCreators()
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 打开 Lightbox
  const handleItemClick = (item: GalleryItem, playableUrl: string | null) => {
    setLightboxItem(item)
    setLightboxPlayableUrl(playableUrl)
  }

  // 关闭 Lightbox
  const handleCloseLightbox = () => {
    setLightboxItem(null)
    setLightboxPlayableUrl(null)
  }

  // 加载中状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 没有权限
  if (!canViewGallery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-lg font-medium">没有访问权限</p>
        <p className="text-sm mt-1">请联系管理员开通 Gallery 权限</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">作品墙</h1>
        {canEdit && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加作品
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <GalleryFilter
        searchText={searchText}
        selectedTags={selectedTags}
        selectedType={selectedType}
        selectedCreatorId={selectedCreatorId}
        sortOrder={sortOrder}
        availableTags={tags}
        availableCreators={creators}
        onSearchChange={setSearchText}
        onTagsChange={(newTags) => {
          setSelectedTags(newTags)
          setPage(1)
        }}
        onTypeChange={(type) => {
          setSelectedType(type)
          setPage(1)
        }}
        onCreatorChange={(creatorId) => {
          setSelectedCreatorId(creatorId)
          setPage(1)
        }}
        onSortOrderChange={(order) => {
          setSortOrder(order)
          setPage(1)
        }}
      />

      {/* 统计信息和列数控制 */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>共 {total} 个作品</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjustColumns(-1)}
            disabled={columns <= 2}
            className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="减少每行卡片数"
          >
            −
          </button>
          <span className="w-6 text-center">{columns}</span>
          <button
            type="button"
            onClick={() => adjustColumns(1)}
            disabled={columns >= 10}
            className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="增加每行卡片数"
          >
            +
          </button>
        </div>
      </div>

      {/* 作品网格 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <GalleryGrid
          items={items}
          canEdit={canEdit}
          columns={columns}
          onItemEdit={handleEdit}
          onItemDelete={handleDelete}
          onItemClick={handleItemClick}
        />
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      <GalleryCardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={editingItem}
        onSave={handleSave}
      />

      {/* Lightbox 查看器 */}
      <GalleryLightbox
        item={lightboxItem}
        playableUrl={lightboxPlayableUrl}
        onClose={handleCloseLightbox}
      />
    </div>
  )
}
