'use client'

import { useState, useRef, useEffect, DragEvent } from 'react'
import Image from 'next/image'
import type { GalleryItem, MediaType, CreateGalleryItemRequest, UpdateGalleryItemRequest } from '@/types/api'
import { GalleryTagInput } from './gallery-tag-input'
import { convertToJpg } from '@/lib/image-utils'

interface GalleryCardModalProps {
  isOpen: boolean
  onClose: () => void
  item?: GalleryItem // undefined = 创建模式
  onSave: (data: CreateGalleryItemRequest | UpdateGalleryItemRequest) => Promise<void>
}

interface MediaUploadState {
  url: string
  type: MediaType | null
  isUploading: boolean
  isDragOver: boolean
  signedUrl?: string // 视频签名 URL 用于显示缩略图
}

export function GalleryCardModal({ isOpen, onClose, item, onSave }: GalleryCardModalProps) {
  const isEditMode = !!item

  // 结果媒体（右侧，必填）
  const [resultMedia, setResultMedia] = useState<MediaUploadState>({
    url: item?.url || '',
    type: item?.type || null,
    isUploading: false,
    isDragOver: false,
  })

  // 原始媒体（左侧，可选）
  const [sourceMedia, setSourceMedia] = useState<MediaUploadState>({
    url: item?.sourceUrl || '',
    type: item?.sourceType || null,
    isUploading: false,
    isDragOver: false,
  })

  const [prompt, setPrompt] = useState(item?.prompt || '')
  const [tags, setTags] = useState<string[]>(item?.tags.map(t => t.name) || [])

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const resultFileInputRef = useRef<HTMLInputElement>(null)
  const sourceFileInputRef = useRef<HTMLInputElement>(null)

  // 当模态框打开或 item 变化时重置状态
  useEffect(() => {
    if (isOpen) {
      setResultMedia({
        url: item?.url || '',
        type: item?.type || null,
        isUploading: false,
        isDragOver: false,
        signedUrl: undefined,
      })
      setSourceMedia({
        url: item?.sourceUrl || '',
        type: item?.sourceType || null,
        isUploading: false,
        isDragOver: false,
        signedUrl: undefined,
      })
      setPrompt(item?.prompt || '')
      setTags(item?.tags.map(t => t.name) || [])
      setError('')
    }
  }, [isOpen, item])

  // 获取视频签名 URL 用于显示缩略图
  useEffect(() => {
    const fetchSignedUrl = async (url: string, setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>) => {
      try {
        const response = await fetch('/api/cos/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (response.ok) {
          const { signedUrl } = await response.json()
          setMedia(prev => ({ ...prev, signedUrl }))
        }
      } catch (error) {
        console.error('获取视频签名 URL 失败:', error)
      }
    }

    // 为结果视频获取签名 URL
    if (resultMedia.type === 'VIDEO' && resultMedia.url && !resultMedia.signedUrl) {
      fetchSignedUrl(resultMedia.url, setResultMedia)
    }

    // 为原始素材视频获取签名 URL
    if (sourceMedia.type === 'VIDEO' && sourceMedia.url && !sourceMedia.signedUrl) {
      fetchSignedUrl(sourceMedia.url, setSourceMedia)
    }
  }, [resultMedia.type, resultMedia.url, resultMedia.signedUrl, sourceMedia.type, sourceMedia.url, sourceMedia.signedUrl])

  if (!isOpen) return null

  const uploadFile = async (
    file: File,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>
  ) => {
    setError('')

    // 检测文件类型
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setError('只支持图片或视频文件')
      return
    }

    const fileType: MediaType = isImage ? 'IMAGE' : 'VIDEO'
    setMedia(prev => ({ ...prev, isUploading: true, type: fileType, signedUrl: undefined }))

    try {
      if (isImage) {
        // 图片上传到 Vercel Blob
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
          setError('不支持的图片格式')
          setMedia(prev => ({ ...prev, isUploading: false }))
          return
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('图片大小不能超过 5MB')
          setMedia(prev => ({ ...prev, isUploading: false }))
          return
        }

        // 转换为 JPG
        const jpgBlob = await convertToJpg(file)
        const formData = new FormData()
        formData.append('file', jpgBlob, file.name.replace(/\.[^.]+$/, '.jpg'))

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('上传失败')
        }

        const data = await response.json()
        setMedia(prev => ({ ...prev, url: data.url, isUploading: false }))
      } else {
        // 视频通过服务端代理上传到腾讯 COS
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
        if (!validTypes.includes(file.type)) {
          setError('不支持的视频格式')
          setMedia(prev => ({ ...prev, isUploading: false }))
          return
        }

        if (file.size > 100 * 1024 * 1024) {
          setError('视频大小不能超过 100MB')
          setMedia(prev => ({ ...prev, isUploading: false }))
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/cos/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '上传失败')
        }

        const data = await response.json()
        setMedia(prev => ({ ...prev, url: data.url, isUploading: false }))
      }
    } catch (err) {
      console.error('上传失败:', err)
      setError(err instanceof Error ? err.message : '上传失败')
      setMedia(prev => ({ ...prev, isUploading: false }))
    }
  }

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setMedia(prev => ({ ...prev, isDragOver: true }))
  }

  const handleDragLeave = (
    e: DragEvent<HTMLDivElement>,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setMedia(prev => ({ ...prev, isDragOver: false }))
  }

  const handleDrop = async (
    e: DragEvent<HTMLDivElement>,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setMedia(prev => ({ ...prev, isDragOver: false }))

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    if (file) {
      await uploadFile(file, setMedia)
    }
  }

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file, setMedia)
    }
    // Reset input to allow selecting the same file again
    e.target.value = ''
  }

  const clearMedia = (setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>) => {
    setMedia({ url: '', type: null, isUploading: false, isDragOver: false, signedUrl: undefined })
  }

  const handleSubmit = async () => {
    setError('')

    if (!isEditMode && !resultMedia.url) {
      setError('请先上传结果媒体文件')
      return
    }

    setIsSaving(true)

    try {
      if (isEditMode) {
        // 编辑模式
        const updateData: UpdateGalleryItemRequest = {
          prompt,
          tags,
          sourceUrl: sourceMedia.url || null,
          sourceType: sourceMedia.type,
        }
        // 如果生成结果有变化，也更新
        if (resultMedia.url && resultMedia.url !== item?.url) {
          updateData.url = resultMedia.url
          updateData.type = resultMedia.type!
        }
        await onSave(updateData)
      } else {
        // 创建模式
        await onSave({
          type: resultMedia.type!,
          url: resultMedia.url,
          sourceUrl: sourceMedia.url || null,
          sourceType: sourceMedia.type,
          prompt,
          tags,
        } as CreateGalleryItemRequest)
      }
      onClose()
    } catch (err) {
      console.error('保存失败:', err)
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 渲染媒体上传/预览区域
  const renderMediaArea = (
    media: MediaUploadState,
    setMedia: React.Dispatch<React.SetStateAction<MediaUploadState>>,
    fileInputRef: React.RefObject<HTMLInputElement | null>,
    label: string,
    required: boolean,
    allowUpload: boolean
  ) => {
    return (
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div
          className={`
            relative border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center
            ${media.isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${media.url ? 'h-auto p-2' : 'h-36'}
          `}
          onDragOver={(e) => allowUpload && handleDragOver(e, setMedia)}
          onDragLeave={(e) => allowUpload && handleDragLeave(e, setMedia)}
          onDrop={(e) => allowUpload && handleDrop(e, setMedia)}
        >
          {media.isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">上传中...</span>
            </div>
          ) : media.url ? (
            <div className="relative w-full aspect-square max-w-[150px]">
              {media.type === 'IMAGE' ? (
                <Image
                  src={media.url}
                  alt="预览"
                  fill
                  className="object-cover rounded"
                  unoptimized
                />
              ) : media.signedUrl ? (
                // 视频缩略图 - 使用 video 元素显示第一帧
                <div className="relative w-full h-full">
                  <video
                    src={media.signedUrl}
                    className="w-full h-full object-cover rounded"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  {/* 播放图标覆盖层 */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                // 视频加载中
                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">加载中</span>
                  </div>
                </div>
              )}
              {allowUpload && (
                <button
                  type="button"
                  onClick={() => clearMedia(setMedia)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ) : allowUpload ? (
            <>
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-1 text-xs text-gray-500">拖拽或点击上传</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileSelect(e, setMedia)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </>
          ) : (
            <div className="py-4 text-gray-400 text-sm">无</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditMode ? '编辑作品' : '添加作品'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 媒体上传区 - 左右布局 */}
          <div>
            <div className="flex items-center gap-4">
              {/* 左侧：原始素材（可选） */}
              {renderMediaArea(sourceMedia, setSourceMedia, sourceFileInputRef, '原始素材', false, true)}

              {/* 中间箭头 */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* 右侧：结果（必填） */}
              {renderMediaArea(resultMedia, setResultMedia, resultFileInputRef, '生成结果', true, true)}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              左侧原始素材可选，右侧生成结果必填。如果有原始素材，查看时会并排展示对比效果。
            </p>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt / 描述
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入作品描述..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <GalleryTagInput
              tags={tags}
              onChange={setTags}
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            disabled={isSaving}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || resultMedia.isUploading || sourceMedia.isUploading || (!isEditMode && !resultMedia.url)}
            className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
