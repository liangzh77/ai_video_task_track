'use client'

import { useState, useEffect, useRef } from 'react'
import type { Tag } from '@/types/api'

interface GalleryTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

export function GalleryTagInput({ tags, onChange, disabled = false }: GalleryTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 搜索标签建议
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/gallery/tags?search=${encodeURIComponent(inputValue)}`)
        if (res.ok) {
          const data = await res.json()
          // 过滤掉已选标签
          setSuggestions(data.tags.filter((t: Tag) => !tags.includes(t.name)))
        }
      } catch (error) {
        console.error('搜索标签失败:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, tags])

  // 点击外部关闭建议列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagName: string) => {
    onChange(tags.filter(t => t !== tagName))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex flex-wrap gap-1 p-2 border rounded-lg bg-white ${disabled ? 'bg-gray-50' : ''}`}>
        {/* 已选标签 */}
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* 输入框 */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? '输入标签，按回车添加...' : ''}
            className="flex-1 min-w-[120px] px-1 py-1 text-sm outline-none"
          />
        )}
      </div>

      {/* 建议列表 */}
      {showSuggestions && (inputValue.trim() || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-400">搜索中...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag.name)}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center justify-between"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-gray-400">{tag.itemCount} 个作品</span>
              </button>
            ))
          ) : inputValue.trim() ? (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="w-full px-3 py-2 text-sm text-left text-blue-600 hover:bg-blue-50"
            >
              创建标签 &quot;{inputValue.trim()}&quot;
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
