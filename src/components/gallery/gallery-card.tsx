'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { GalleryItem } from '@/types/api'

interface GalleryCardProps {
  item: GalleryItem
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

export function GalleryCard({ item, canEdit, onEdit, onDelete }: GalleryCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [playableUrl, setPlayableUrl] = useState<string | null>(null)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 获取视频签名 URL
  useEffect(() => {
    if (item.type !== 'VIDEO') return

    let cancelled = false

    const loadVideo = async () => {
      setIsLoadingVideo(true)
      try {
        const signResponse = await fetch('/api/cos/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        })

        if (signResponse.ok && !cancelled) {
          const { signedUrl } = await signResponse.json()
          setPlayableUrl(signedUrl)
        }
      } catch (error) {
        console.error('加载视频失败:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingVideo(false)
        }
      }
    }

    loadVideo()

    return () => {
      cancelled = true
    }
  }, [item.type, item.url])

  const handleDelete = () => {
    onDelete()
    setShowDeleteConfirm(false)
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 group cursor-pointer">
      {/* 媒体内容 */}
      {item.type === 'IMAGE' ? (
        <Image
          src={item.url}
          alt={item.prompt || '作品'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          {isLoadingVideo ? (
            <span className="text-gray-400 text-sm">加载中...</span>
          ) : playableUrl ? (
            <video
              ref={videoRef}
              src={playableUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <span className="text-gray-400 text-sm">视频</span>
          )}
          {/* 播放图标 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Hover 遮罩 - 显示 prompt */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
        {item.prompt && (
          <p className="text-white text-sm line-clamp-4">{item.prompt}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="px-2 py-0.5 bg-white/20 rounded text-xs text-white"
              >
                {tag.name}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {canEdit && !showDeleteConfirm && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="w-7 h-7 bg-blue-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-blue-600"
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            className="w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600"
            title="删除"
          >
            ×
          </button>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-10">
          <span className="text-white text-sm">确认删除？</span>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              删除
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
