'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { GalleryItem } from '@/types/api'

interface GalleryLightboxProps {
  item: GalleryItem | null
  playableUrl?: string | null
  onClose: () => void
}

export function GalleryLightbox({ item, playableUrl, onClose }: GalleryLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // 按 ESC 关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    // 打开时自动播放视频
    if (item?.type === 'VIDEO' && videoRef.current && playableUrl) {
      videoRef.current.play().catch(() => {})
    }
  }, [item, playableUrl])

  // 复制 Prompt
  const handleCopyPrompt = async () => {
    if (!item?.prompt) return
    try {
      await navigator.clipboard.writeText(item.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  // 下载文件
  const handleDownload = async () => {
    if (!item) return
    const downloadUrl = item.type === 'VIDEO' ? playableUrl : item.url
    if (!downloadUrl) return

    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = item.type === 'VIDEO' ? 'mp4' : 'jpg'
      a.download = `${item.id}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl z-10"
      >
        ×
      </button>

      {/* 内容区域 - 垂直布局 */}
      <div
        className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 媒体内容 */}
        <div className="flex-shrink-0">
          {item.type === 'IMAGE' ? (
            <Image
              src={item.url}
              alt={item.prompt || '作品'}
              width={1200}
              height={1200}
              className="max-w-[90vw] max-h-[70vh] object-contain"
              unoptimized
            />
          ) : (
            <video
              ref={videoRef}
              src={playableUrl || undefined}
              className="max-w-[90vw] max-h-[70vh]"
              controls
              autoPlay
            />
          )}
        </div>

        {/* 底部信息区域 - 不遮挡媒体 */}
        <div className="w-full max-w-[90vw] mt-4 px-4">
          {/* 时间、创作者和操作按钮 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 text-white/60 text-xs">
              <span>{new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
              {item.creator && <span>by {item.creator.username}</span>}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 复制 Prompt 按钮 */}
              {item.prompt && (
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 text-white text-xs"
                  title="复制 Prompt"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      复制
                    </>
                  )}
                </button>
              )}

              {/* 下载按钮 */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-2 text-white text-xs"
                title="下载"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载
              </button>
            </div>
          </div>

          {/* Prompt */}
          {item.prompt && (
            <p
              className="text-white text-sm mb-2 whitespace-pre-wrap max-h-[7.5rem] overflow-y-auto pr-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) transparent',
              }}
            >{item.prompt}</p>
          )}

          {/* 标签 */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(tag => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 bg-white/20 rounded text-xs text-white"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
