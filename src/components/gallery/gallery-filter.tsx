'use client'

import { useState, useEffect, useRef } from 'react'
import type { MediaType, Tag } from '@/types/api'

interface GalleryFilterProps {
  searchText: string
  selectedTags: string[]
  selectedType: MediaType | null
  availableTags: Tag[]
  onSearchChange: (text: string) => void
  onTagsChange: (tags: string[]) => void
  onTypeChange: (type: MediaType | null) => void
}

export function GalleryFilter({
  searchText,
  selectedTags,
  selectedType,
  availableTags,
  onSearchChange,
  onTagsChange,
  onTypeChange,
}: GalleryFilterProps) {
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName))
    } else {
      onTagsChange([...selectedTags, tagName])
    }
  }

  const clearFilters = () => {
    onSearchChange('')
    onTagsChange([])
    onTypeChange(null)
  }

  const hasFilters = searchText || selectedTags.length > 0 || selectedType

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 搜索框 */}
      <div className="relative">
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索 prompt..."
          className="w-48 px-3 py-2 pl-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 类型筛选 */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button
          type="button"
          onClick={() => onTypeChange(null)}
          className={`px-3 py-2 text-sm ${selectedType === null ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          全部
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('IMAGE')}
          className={`px-3 py-2 text-sm border-l border-gray-300 ${selectedType === 'IMAGE' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          图片
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('VIDEO')}
          className={`px-3 py-2 text-sm border-l border-gray-300 ${selectedType === 'VIDEO' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          视频
        </button>
      </div>

      {/* 标签筛选 */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowTagDropdown(!showTagDropdown)}
          className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 ${
            selectedTags.length > 0
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          标签
          {selectedTags.length > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {selectedTags.length}
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTagDropdown && (
          <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {availableTags.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">暂无标签</div>
            ) : (
              availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 ${
                    selectedTags.includes(tag.name) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span>{tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.itemCount}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 清除筛选 */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          清除筛选
        </button>
      )}
    </div>
  )
}
