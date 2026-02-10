'use client'

export type SortField = 'order' | 'createdAt' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'
export type FilterPreset = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom'
export type FilterField = 'createdAt' | 'updatedAt'

interface SortFilterToolbarProps {
  sortField: SortField
  sortDirection: SortDirection
  filterPreset: FilterPreset
  filterField: FilterField
  filterDateFrom: string
  filterDateTo: string
  onSortFieldChange: (field: SortField) => void
  onSortDirectionChange: (dir: SortDirection) => void
  onFilterPresetChange: (preset: FilterPreset) => void
  onFilterFieldChange: (field: FilterField) => void
  onFilterDateFromChange: (date: string) => void
  onFilterDateToChange: (date: string) => void
  onReset: () => void
  onCollapseAll?: () => void
  onExpandAll?: () => void
  cardSizeLabel?: string
  onCardSizeDecrease?: () => void
  onCardSizeIncrease?: () => void
  canDecrease?: boolean
  canIncrease?: boolean
}

const selectClass =
  'px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'

const dateInputClass =
  'px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-[140px]'

export function SortFilterToolbar({
  sortField,
  sortDirection,
  filterPreset,
  filterField,
  filterDateFrom,
  filterDateTo,
  onSortFieldChange,
  onSortDirectionChange,
  onFilterPresetChange,
  onFilterFieldChange,
  onFilterDateFromChange,
  onFilterDateToChange,
  onReset,
  onCollapseAll,
  onExpandAll,
  cardSizeLabel,
  onCardSizeDecrease,
  onCardSizeIncrease,
  canDecrease = true,
  canIncrease = true,
}: SortFilterToolbarProps) {
  const isNonDefault = sortField !== 'order' || filterPreset !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
      {/* 排序 */}
      <span className="text-gray-500 font-medium">排序:</span>
      <select
        className={selectClass}
        value={sortField}
        onChange={(e) => onSortFieldChange(e.target.value as SortField)}
      >
        <option value="order">默认排序</option>
        <option value="createdAt">创建时间</option>
        <option value="updatedAt">更新时间</option>
      </select>

      {sortField !== 'order' && (
        <select
          className={selectClass}
          value={sortDirection}
          onChange={(e) => onSortDirectionChange(e.target.value as SortDirection)}
        >
          <option value="desc">最新优先</option>
          <option value="asc">最早优先</option>
        </select>
      )}

      <span className="text-gray-300">|</span>

      {/* 筛选 */}
      <span className="text-gray-500 font-medium">筛选:</span>
      <select
        className={selectClass}
        value={filterPreset}
        onChange={(e) => onFilterPresetChange(e.target.value as FilterPreset)}
      >
        <option value="all">全部</option>
        <option value="today">今天</option>
        <option value="thisWeek">本周</option>
        <option value="thisMonth">本月</option>
        <option value="custom">自定义</option>
      </select>

      {filterPreset !== 'all' && (
        <select
          className={selectClass}
          value={filterField}
          onChange={(e) => onFilterFieldChange(e.target.value as FilterField)}
        >
          <option value="createdAt">创建时间</option>
          <option value="updatedAt">更新时间</option>
        </select>
      )}

      {filterPreset === 'custom' && (
        <>
          <input
            type="date"
            className={dateInputClass}
            value={filterDateFrom}
            onChange={(e) => onFilterDateFromChange(e.target.value)}
            placeholder="开始日期"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            className={dateInputClass}
            value={filterDateTo}
            onChange={(e) => onFilterDateToChange(e.target.value)}
            placeholder="结束日期"
          />
        </>
      )}

      {/* 重置 & 提示 */}
      {isNonDefault && (
        <>
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            重置
          </button>
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            拖拽排序已禁用
          </span>
        </>
      )}

      <span className="text-gray-300">|</span>

      {/* 折叠/展开 */}
      {onCollapseAll && (
        <button
          type="button"
          onClick={onCollapseAll}
          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
        >
          全部折叠
        </button>
      )}
      {onExpandAll && (
        <button
          type="button"
          onClick={onExpandAll}
          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
        >
          全部展开
        </button>
      )}

      {/* 卡片尺寸 */}
      {onCardSizeDecrease && onCardSizeIncrease && (
        <>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={onCardSizeDecrease}
            disabled={!canDecrease}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="text-xs text-gray-500 w-8 text-center">{cardSizeLabel}</span>
          <button
            type="button"
            onClick={onCardSizeIncrease}
            disabled={!canIncrease}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </>
      )}
    </div>
  )
}
