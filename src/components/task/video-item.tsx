'use client'

import { useState, useRef, useEffect, DragEvent } from 'react'
import { getCachedVideo, setCachedVideo, cleanExpiredCache } from '@/lib/video-cache'

interface VideoItemProps {
  videoUrl: string | null
  onUpdate: (videoUrl: string | null) => Promise<void>
  disabled?: boolean
}

export function VideoItem({ videoUrl, onUpdate, disabled = false }: VideoItemProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [playableUrl, setPlayableUrl] = useState<string | null>(null)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  // 启动时清理过期缓存
  useEffect(() => {
    cleanExpiredCache(7) // 清理 7 天前的缓存
  }, [])

  // 获取视频（优先从缓存，否则从网络）
  useEffect(() => {
    if (!videoUrl) {
      setPlayableUrl(null)
      return
    }

    let cancelled = false

    const loadVideo = async () => {
      setIsLoadingVideo(true)

      try {
        // 1. 先检查 IndexedDB 缓存
        const cachedBlob = await getCachedVideo(videoUrl)
        if (cachedBlob && !cancelled) {
          // 缓存命中，创建 blob URL
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
          }
          const blobUrl = URL.createObjectURL(cachedBlob)
          blobUrlRef.current = blobUrl
          setPlayableUrl(blobUrl)
          setIsLoadingVideo(false)
          return
        }

        // 2. 缓存未命中，获取签名 URL
        const signResponse = await fetch('/api/cos/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        })

        if (!signResponse.ok || cancelled) {
          throw new Error('获取签名 URL 失败')
        }

        const { signedUrl } = await signResponse.json()

        // 3. 从签名 URL 下载视频
        const videoResponse = await fetch(signedUrl)
        if (!videoResponse.ok || cancelled) {
          throw new Error('下载视频失败')
        }

        const blob = await videoResponse.blob()
        if (cancelled) return

        // 4. 存入缓存
        await setCachedVideo(videoUrl, blob)

        // 5. 创建 blob URL 并使用
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
        }
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        setPlayableUrl(blobUrl)
      } catch (error) {
        console.error('加载视频失败:', error)
        // 失败时尝试直接使用签名 URL
        try {
          const signResponse = await fetch('/api/cos/sign-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl }),
          })
          if (signResponse.ok && !cancelled) {
            const { signedUrl } = await signResponse.json()
            setPlayableUrl(signedUrl)
          }
        } catch {
          // 忽略
        }
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
  }, [videoUrl])

  // 上传视频到 COS
  const uploadVideo = async (file: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!validTypes.includes(file.type)) {
      console.error('不支持的视频格式')
      return
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB 限制
      console.error('视频大小不能超过 100MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 1. 获取预签名 URL
      const presignRes = await fetch('/api/cos/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      })

      if (!presignRes.ok) {
        throw new Error('获取上传凭证失败')
      }

      const { uploadUrl, fileUrl, contentType } = await presignRes.json()

      // 2. 上传到 COS（使用预签名 URL）
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      // 设置 Content-Type 以便 COS 正确存储文件类型
      xhr.setRequestHeader('Content-Type', contentType || file.type)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve()
          } else {
            reject(new Error(`上传失败: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('网络错误'))
        xhr.send(file)
      })

      // 3. 保存视频 URL 到任务
      await onUpdate(fileUrl)
    } catch (error) {
      console.error('上传视频失败:', error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const videoFile = files.find(file => file.type.startsWith('video/'))

    if (videoFile) {
      await uploadVideo(videoFile)
    }
  }

  const handleDelete = async () => {
    await onUpdate(null)
    setShowDeleteConfirm(false)
  }

  const handleDownload = async () => {
    if (!playableUrl) return
    try {
      // 如果是 blob URL，直接下载
      if (playableUrl.startsWith('blob:')) {
        const link = document.createElement('a')
        link.href = playableUrl
        link.download = videoUrl?.split('/').pop() || 'video.mp4'
        link.click()
      } else {
        // 否则需要 fetch
        const response = await fetch(playableUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = videoUrl?.split('/').pop() || 'video.mp4'
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!videoUrl) return
    setPreviewPosition({ x: e.clientX, y: e.clientY })
    setShowPreview(true)
    // 尝试有声自动播放，如果浏览器不允许则静音播放
    setTimeout(() => {
      const video = previewVideoRef.current
      if (!video) return
      video.muted = false
      video.play().catch(() => {
        // 有声播放失败，尝试静音播放
        video.muted = true
        video.play().catch(() => {
          // 静音也失败，放弃自动播放
        })
      })
    }, 100)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setPreviewPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setShowPreview(false)
    previewVideoRef.current?.pause()
  }

  // 计算预览位置（参考图片预览逻辑）
  const getPreviewPosition = () => {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    // 视频预览高度为 80vh + padding，宽度为 50% 视口
    const estimatedHeight = viewportHeight * 0.8
    const estimatedWidth = viewportWidth * 0.5

    let x = previewPosition.x + 20
    let y = previewPosition.y - 100

    // 确保下边界不超出视口
    if (y + estimatedHeight > viewportHeight - 20) {
      y = viewportHeight - estimatedHeight - 20
    }
    // 确保上边界不超出视口
    if (y < 20) {
      y = 20
    }
    // 确保右边界不超出视口
    if (x + estimatedWidth > viewportWidth - 20) {
      x = previewPosition.x - estimatedWidth - 20
    }

    return { x, y }
  }

  // 无视频状态 - 显示上传区域
  if (!videoUrl) {
    return (
      <div
        className={`
          relative h-[100px] w-[100px] flex-shrink-0 rounded border-2 border-dashed
          flex items-center justify-center text-center
          ${disabled ? 'border-gray-200 bg-gray-50 text-gray-300' :
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-1 bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 px-2">
            {disabled ? '无视频' : '拖拽视频到此处'}
          </span>
        )}
      </div>
    )
  }

  // 有视频状态
  const previewPos = getPreviewPosition()

  return (
    <>
      <div
        className={`
          relative h-[100px] w-[100px] flex-shrink-0 rounded border-2 overflow-hidden group
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* 视频缩略图 */}
        {isLoadingVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-xs text-gray-400">加载中...</span>
          </div>
        ) : playableUrl ? (
          <video
            ref={videoRef}
            src={playableUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-xs text-gray-400">加载失败</span>
          </div>
        )}

        {/* 播放图标 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 操作按钮 */}
        {!showDeleteConfirm && (
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 下载按钮 */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-5 h-5 bg-green-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-green-600"
              title="下载"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {/* 删除按钮 */}
            {!disabled && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                title="删除"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* 删除确认 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
            <span className="text-white text-xs">确认删除？</span>
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                className="px-2 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                是
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                否
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 视频预览弹窗 */}
      {showPreview && playableUrl && (
        <div
          className="fixed z-50"
          style={{
            left: previewPos.x,
            top: previewPos.y,
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-2 max-w-[85vw] max-h-[85vh]">
            <video
              ref={previewVideoRef}
              src={playableUrl}
              className="max-w-full max-h-[80vh] object-contain rounded"
              loop
              playsInline
              controls
            />
          </div>
        </div>
      )}
    </>
  )
}
