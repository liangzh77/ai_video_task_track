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

export function GalleryCardModal({ isOpen, onClose, item, onSave }: GalleryCardModalProps) {
  const isEditMode = !!item

  const [type, setType] = useState<MediaType>(item?.type || 'IMAGE')
  const [url, setUrl] = useState(item?.url || '')
  const [prompt, setPrompt] = useState(item?.prompt || '')
  const [tags, setTags] = useState<string[]>(item?.tags.map(t => t.name) || [])

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当模态框打开或 item 变化时重置状态
  useEffect(() => {
    if (isOpen) {
      setType(item?.type || 'IMAGE')
      setUrl(item?.url || '')
      setPrompt(item?.prompt || '')
      setTags(item?.tags.map(t => t.name) || [])
      setError('')
    }
  }, [isOpen, item])

  if (!isOpen) return null

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
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
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    setError('')

    // 检测文件类型
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      setError('只支持图片或视频文件')
      return
    }

    // 设置类型
    const fileType: MediaType = isImage ? 'IMAGE' : 'VIDEO'
    setType(fileType)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      if (isImage) {
        // 图片上传到 Vercel Blob
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
          setError('不支持的图片格式')
          setIsUploading(false)
          return
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('图片大小不能超过 5MB')
          setIsUploading(false)
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
        setUrl(data.url)
      } else {
        // 视频上传到腾讯 COS
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
        if (!validTypes.includes(file.type)) {
          setError('不支持的视频格式')
          setIsUploading(false)
          return
        }

        if (file.size > 100 * 1024 * 1024) {
          setError('视频大小不能超过 100MB')
          setIsUploading(false)
          return
        }

        // 获取预签名 URL
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

        // 上传到 COS
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
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

        setUrl(fileUrl)
      }
    } catch (err) {
      console.error('上传失败:', err)
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async () => {
    setError('')

    if (!isEditMode && !url) {
      setError('请先上传媒体文件')
      return
    }

    setIsSaving(true)

    try {
      if (isEditMode) {
        // 编辑模式 - 只更新 prompt 和 tags
        await onSave({
          prompt,
          tags,
        } as UpdateGalleryItemRequest)
      } else {
        // 创建模式
        await onSave({
          type,
          url,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
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
          {/* 媒体上传区 */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                媒体文件
              </label>
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-6
                  flex flex-col items-center justify-center
                  ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${url ? 'h-auto' : 'h-48'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                ) : url ? (
                  <div className="relative w-full aspect-square max-w-[200px]">
                    {type === 'IMAGE' ? (
                      <Image
                        src={url}
                        alt="预览"
                        fill
                        className="object-cover rounded"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">拖拽图片或视频到这里</p>
                    <p className="text-xs text-gray-400 mt-1">或点击选择文件</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* 编辑模式显示当前媒体预览 */}
          {isEditMode && item && (
            <div className="relative w-32 h-32 mx-auto">
              {item.type === 'IMAGE' ? (
                <Image
                  src={item.url}
                  alt="预览"
                  fill
                  className="object-cover rounded"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
          )}

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
            disabled={isSaving || isUploading || (!isEditMode && !url)}
            className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
