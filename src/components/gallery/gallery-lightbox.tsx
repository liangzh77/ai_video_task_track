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
  const resultVideoRef = useRef<HTMLVideoElement>(null)
  const sourceVideoRef = useRef<HTMLVideoElement>(null)
  const [copied, setCopied] = useState(false)
  const [sourcePlayableUrl, setSourcePlayableUrl] = useState<string | null>(null)
  const [isLoadingSourceVideo, setIsLoadingSourceVideo] = useState(false)

  // 加载原始素材的视频签名 URL
  useEffect(() => {
    if (!item?.sourceUrl || item.sourceType !== 'VIDEO') {
      setSourcePlayableUrl(null)
      return
    }

    let cancelled = false
    setIsLoadingSourceVideo(true)

    const loadSourceVideo = async () => {
      try {
        const signResponse = await fetch('/api/cos/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.sourceUrl }),
        })

        if (signResponse.ok && !cancelled) {
          const { signedUrl } = await signResponse.json()
          setSourcePlayableUrl(signedUrl)
        }
      } catch (error) {
        console.error('加载原始视频失败:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingSourceVideo(false)
        }
      }
    }

    loadSourceVideo()

    return () => {
      cancelled = true
    }
  }, [item?.sourceUrl, item?.sourceType])

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

  // 同步播放两个视频
  useEffect(() => {
    if (!item) return

    const hasSourceVideo = item.sourceType === 'VIDEO' && item.sourceUrl
    const hasResultVideo = item.type === 'VIDEO'

    // 对比模式：两个都是视频时，等待两个视频都准备好再同时播放
    if (hasSourceVideo && hasResultVideo) {
      // 等待两个视频 URL 都加载完成
      if (!sourcePlayableUrl || !playableUrl) return

      // 使用 setTimeout 确保 DOM 已更新
      const timer = setTimeout(() => {
        const sourceVideo = sourceVideoRef.current
        const resultVideo = resultVideoRef.current

        if (!sourceVideo || !resultVideo) return

        let sourceReady = false
        let resultReady = false

        // 同时播放两个视频
        const playBoth = () => {
          sourceVideo.currentTime = 0
          resultVideo.currentTime = 0
          sourceVideo.play().catch(() => {})
          resultVideo.play().catch(() => {})
        }

        const checkAndPlay = () => {
          if (sourceReady && resultReady) {
            playBoth()
          }
        }

        const onSourceCanPlay = () => {
          sourceReady = true
          checkAndPlay()
        }

        const onResultCanPlay = () => {
          resultReady = true
          checkAndPlay()
        }

        // 检查是否已经可以播放
        if (sourceVideo.readyState >= 3) {
          sourceReady = true
        } else {
          sourceVideo.addEventListener('canplaythrough', onSourceCanPlay, { once: true })
        }

        if (resultVideo.readyState >= 3) {
          resultReady = true
        } else {
          resultVideo.addEventListener('canplaythrough', onResultCanPlay, { once: true })
        }

        // 如果两个都准备好了，直接播放
        checkAndPlay()
      }, 100)

      return () => clearTimeout(timer)
    } else if (hasResultVideo && playableUrl) {
      // 只有结果是视频
      const timer = setTimeout(() => {
        resultVideoRef.current?.play().catch(() => {})
      }, 100)
      return () => clearTimeout(timer)
    } else if (hasSourceVideo && sourcePlayableUrl) {
      // 只有原始素材是视频
      const timer = setTimeout(() => {
        sourceVideoRef.current?.play().catch(() => {})
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [item, playableUrl, sourcePlayableUrl])

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

  const hasComparison = !!item.sourceUrl

  // 检查是否需要同步播放（两边都是视频）
  const needSyncPlay = item.sourceType === 'VIDEO' && item.type === 'VIDEO' && hasComparison

  // 渲染单个媒体
  const renderMedia = (
    type: 'IMAGE' | 'VIDEO',
    url: string,
    signedUrl: string | null,
    isLoading: boolean,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    itemId: string
  ) => {
    // 对比模式使用固定容器尺寸，确保两边大小一致
    const containerClass = hasComparison
      ? 'w-[40vw] h-[60vh] relative'
      : ''

    if (type === 'IMAGE') {
      if (hasComparison) {
        // 对比模式：使用 fill 属性让图片填充容器
        return (
          <div className={containerClass}>
            <Image
              src={url}
              alt="作品"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )
      }
      // 单图模式
      return (
        <Image
          src={url}
          alt="作品"
          width={1200}
          height={1200}
          className="max-w-[90vw] max-h-[70vh] object-contain"
          unoptimized
        />
      )
    }

    if (isLoading) {
      const loadingElement = (
        <div className="flex items-center justify-center w-full h-full bg-gray-800 text-white">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">加载视频中...</span>
          </div>
        </div>
      )
      return hasComparison ? <div className={containerClass}>{loadingElement}</div> : (
        <div className="flex items-center justify-center w-[400px] h-[300px] bg-gray-800 text-white">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">加载视频中...</span>
          </div>
        </div>
      )
    }

    if (signedUrl) {
      if (hasComparison) {
        // 对比模式：视频填充容器
        return (
          <div className={`${containerClass} flex items-center justify-center`}>
            <video
              key={`${itemId}-${signedUrl}`}
              ref={videoRef}
              src={signedUrl}
              className="max-w-full max-h-full object-contain"
              controls
              autoPlay={!needSyncPlay}
            />
          </div>
        )
      }
      // 单视频模式
      return (
        <video
          key={`${itemId}-${signedUrl}`}
          ref={videoRef}
          src={signedUrl}
          className="max-w-[90vw] max-h-[70vh]"
          controls
          autoPlay={!needSyncPlay}
        />
      )
    }

    const placeholderElement = (
      <div className="flex items-center justify-center w-full h-full bg-gray-800 text-white">
        加载视频中...
      </div>
    )
    return hasComparison ? <div className={containerClass}>{placeholderElement}</div> : (
      <div className="flex items-center justify-center w-[400px] h-[300px] bg-gray-800 text-white">
        加载视频中...
      </div>
    )
  }

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
        className="flex flex-col items-center max-w-[95vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 媒体内容 */}
        <div className="flex-shrink-0">
          {hasComparison ? (
            // 对比模式 - 左右布局
            <div className="flex items-center gap-4">
              {/* 左侧：原始素材 */}
              <div className="flex flex-col items-center">
                <span className="text-white/60 text-xs mb-2">原始素材</span>
                {renderMedia(
                  item.sourceType!,
                  item.sourceUrl!,
                  item.sourceType === 'VIDEO' ? sourcePlayableUrl : item.sourceUrl!,
                  item.sourceType === 'VIDEO' && isLoadingSourceVideo,
                  sourceVideoRef,
                  `source-${item.id}`
                )}
              </div>

              {/* 中间箭头 */}
              <div className="flex-shrink-0 flex items-center justify-center px-4">
                <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* 右侧：生成结果 */}
              <div className="flex flex-col items-center">
                <span className="text-white/60 text-xs mb-2">生成结果</span>
                {renderMedia(
                  item.type,
                  item.url,
                  item.type === 'VIDEO' ? playableUrl ?? null : item.url,
                  false,
                  resultVideoRef,
                  `result-${item.id}`
                )}
              </div>
            </div>
          ) : (
            // 单个媒体模式
            renderMedia(
              item.type,
              item.url,
              item.type === 'VIDEO' ? playableUrl ?? null : item.url,
              false,
              resultVideoRef,
              item.id
            )
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
