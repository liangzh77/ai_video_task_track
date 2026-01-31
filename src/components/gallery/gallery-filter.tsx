'use client'

import { useState, useEffect, useRef } from 'react'
import type { MediaType, Tag } from '@/types/api'

export interface Creator {
  id: string
  username: string
  itemCount: number
}

export type SortOrder = 'desc' | 'asc'

interface GalleryFilterProps {
  searchText: string
  selectedTags: string[]
  selectedType: MediaType | null
  selectedCreatorId: string | null
  sortOrder: SortOrder
  availableTags: Tag[]
  availableCreators: Creator[]
  onSearchChange: (text: string) => void
  onTagsChange: (tags: string[]) => void
  onTypeChange: (type: MediaType | null) => void
  onCreatorChange: (creatorId: string | null) => void
  onSortOrderChange: (order: SortOrder) => void
}

export function GalleryFilter({
  searchText,
  selectedTags,
  selectedType,
  selectedCreatorId,
  sortOrder,
  availableTags,
  availableCreators,
  onSearchChange,
  onTagsChange,
  onTypeChange,
  onCreatorChange,
  onSortOrderChange,
}: GalleryFilterProps) {
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false)
  const creatorDropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (creatorDropdownRef.current && !creatorDropdownRef.current.contains(event.target as Node)) {
        setShowCreatorDropdown(false)
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
    onCreatorChange(null)
    onSortOrderChange('desc')
  }

  const hasFilters = searchText || selectedTags.length > 0 || selectedType || selectedCreatorId || sortOrder !== 'desc'

  const selectedCreator = availableCreators.find(c => c.id === selectedCreatorId)

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

      {/* 标签筛选 - 横排显示 */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.name)}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* 作者筛选 */}
      <div className="relative" ref={creatorDropdownRef}>
        <button
          type="button"
          onClick={() => setShowCreatorDropdown(!showCreatorDropdown)}
          className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 ${
            selectedCreatorId
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {selectedCreator ? selectedCreator.username : '作者'}
          <svg className={`w-4 h-4 transition-transform ${showCreatorDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCreatorDropdown && (
          <div className="absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <button
              type="button"
              onClick={() => {
                onCreatorChange(null)
                setShowCreatorDropdown(false)
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                !selectedCreatorId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              全部作者
            </button>
            {availableCreators.map(creator => (
              <button
                key={creator.id}
                type="button"
                onClick={() => {
                  onCreatorChange(creator.id)
                  setShowCreatorDropdown(false)
                }}
                className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 ${
                  selectedCreatorId === creator.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span>{creator.username}</span>
                <span className="text-xs text-gray-400">{creator.itemCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 排序 */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button
          type="button"
          onClick={() => onSortOrderChange('desc')}
          className={`px-3 py-2 text-sm flex items-center gap-1 ${sortOrder === 'desc' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          最新
        </button>
        <button
          type="button"
          onClick={() => onSortOrderChange('asc')}
          className={`px-3 py-2 text-sm border-l border-gray-300 flex items-center gap-1 ${sortOrder === 'asc' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
          最早
        </button>
      </div>

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
