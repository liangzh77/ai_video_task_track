'use client'

import { useState, useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

interface ImageUploaderProps {
  onUploadComplete: (urls: string[]) => void
  disabled?: boolean
}

export function ImageUploader({ onUploadComplete, disabled = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `不支持的文件类型: ${file.name}，仅支持 JPEG、PNG、GIF、WebP`
    }
    if (file.size > MAX_SIZE) {
      return `文件过大: ${file.name}，最大支持 5MB`
    }
    return null
  }

  const uploadFiles = async (files: File[]) => {
    setError('')
    setIsUploading(true)
    setProgress(0)

    // Validate all files first
    const validationErrors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push(file)
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
      if (validFiles.length === 0) {
        setIsUploading(false)
        return
      }
    }

    const uploadedUrls: string[] = []
    const totalFiles = validFiles.length

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '上传失败')
        }

        const data = await response.json()
        uploadedUrls.push(data.url)
        setProgress(((i + 1) / totalFiles) * 100)
      } catch {
        setError(prev =>
          prev ? `${prev}\n上传 ${file.name} 失败` : `上传 ${file.name} 失败`
        )
      }
    }

    setIsUploading(false)
    setProgress(0)

    if (uploadedUrls.length > 0) {
      onUploadComplete(uploadedUrls)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || isUploading) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      uploadFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">上传中... {Math.round(progress)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600">
              拖放图片到此处，或点击选择文件
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 JPEG、PNG、GIF、WebP，最大 5MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-50 rounded whitespace-pre-line">
          {error}
        </div>
      )}
    </div>
  )
}
