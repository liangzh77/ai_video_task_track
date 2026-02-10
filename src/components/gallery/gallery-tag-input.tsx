'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Tag } from '@/types/api'

interface GalleryTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

export function GalleryTagInput({ tags, onChange, disabled = false }: GalleryTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAllTags, setShowAllTags] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const allTagsRef = useRef<HTMLDivElement>(null)

  // 计算下拉菜单位置
  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

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
          // 过滤掉已选标签和没有作品的标签
          setSuggestions(data.tags.filter((t: Tag) => !tags.includes(t.name) && (t.itemCount ?? 0) > 0))
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
      const target = event.target as Node
      // 检查点击是否在容器、建议列表或所有标签列表内
      const isInsideContainer = containerRef.current?.contains(target)
      const isInsideSuggestions = suggestionsRef.current?.contains(target)
      const isInsideAllTags = allTagsRef.current?.contains(target)

      if (!isInsideContainer && !isInsideSuggestions && !isInsideAllTags) {
        setShowSuggestions(false)
        setShowAllTags(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 加载所有标签
  const loadAllTags = async () => {
    updateDropdownPosition()
    if (allTags.length > 0) {
      setShowAllTags(!showAllTags)
      setShowSuggestions(false)
      return
    }

    setIsLoadingAll(true)
    try {
      const res = await fetch('/api/gallery/tags')
      if (res.ok) {
        const data = await res.json()
        // 只保留有作品使用的标签
        setAllTags(data.tags.filter((t: Tag) => (t.itemCount ?? 0) > 0))
        setShowAllTags(true)
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('加载标签失败:', error)
    } finally {
      setIsLoadingAll(false)
    }
  }

  // 添加标签（支持逗号分隔）
  const addTag = (tagName: string) => {
    // 按中英文逗号分隔
    const tagNames = tagName.split(/[,，]/).map(t => t.trim()).filter(t => t)
    const newTags = tagNames.filter(t => !tags.includes(t))
    if (newTags.length > 0) {
      onChange([...tags, ...newTags])
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

  // 过滤未选的标签（排除没有作品使用的标签）
  const availableTags = allTags.filter(t => !tags.includes(t.name) && (t.itemCount ?? 0) > 0)

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
              updateDropdownPosition()
              setShowSuggestions(true)
              setShowAllTags(false)
            }}
            onFocus={() => {
              updateDropdownPosition()
              setShowSuggestions(true)
              setShowAllTags(false)
            }}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? '输入标签，逗号分隔多个...' : ''}
            className="flex-1 min-w-[120px] px-1 py-1 text-sm outline-none"
          />
        )}

        {/* 显示所有标签按钮 */}
        {!disabled && (
          <button
            type="button"
            onClick={loadAllTags}
            className="px-2 py-1 text-gray-400 hover:text-gray-600"
            title="查看所有标签"
          >
            {isLoadingAll ? (
              <span className="text-xs">...</span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* 建议列表 - 使用 Portal 渲染到 body */}
      {showSuggestions && (inputValue.trim() || suggestions.length > 0) && dropdownPosition && createPortal(
        <div
          ref={suggestionsRef}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
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
        </div>,
        document.body
      )}

      {/* 所有标签列表 - 使用 Portal 渲染到 body */}
      {showAllTags && dropdownPosition && createPortal(
        <div
          ref={allTagsRef}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
          {availableTags.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-400 border-b sticky top-0 bg-white">
                所有标签 ({availableTags.length})
              </div>
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    addTag(tag.name)
                    setShowAllTags(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>{tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.itemCount} 个作品</span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">
              {allTags.length === 0 ? '暂无标签' : '已选择所有标签'}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
