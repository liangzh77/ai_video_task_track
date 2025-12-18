'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface CsvImportModalProps {
  isOpen: boolean
  csvFile: File | null
  onClose: () => void
  onImport: (date: string, data: CsvRowData[]) => Promise<void>
}

export interface CsvRowData {
  materialId: string
  cost: number
  impressions: number
  clicks: number
  clickRate: number
  cpm: number
  conversions: number
  conversionCost: number
  activations: number
  dailyPayment: number
  materialScore: number
}

// CSV 列名映射
const COLUMN_MAP: Record<string, keyof CsvRowData> = {
  '素材id': 'materialId',
  '素材ID': 'materialId',
  'materialId': 'materialId',
  '消耗': 'cost',
  '展示数': 'impressions',
  '点击数': 'clicks',
  '点击率(%)': 'clickRate',
  '点击率': 'clickRate',
  '平均千次展现费用(元)': 'cpm',
  '平均千次展现费用': 'cpm',
  'CPM': 'cpm',
  'cpm': 'cpm',
  '转化数': 'conversions',
  '转化成本': 'conversionCost',
  '激活数': 'activations',
  '计费当日付费金额': 'dailyPayment',
  '素材评估': 'materialScore',
}

// 解析 CSV 内容
function parseCsv(content: string): CsvRowData[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // 解析表头
  const headers = parseCSVLine(lines[0])
  const columnIndices: Record<keyof CsvRowData, number> = {} as Record<keyof CsvRowData, number>

  headers.forEach((header, index) => {
    const trimmedHeader = header.trim()
    const mappedKey = COLUMN_MAP[trimmedHeader]
    if (mappedKey) {
      columnIndices[mappedKey] = index
    }
  })

  // 解析数据行
  const data: CsvRowData[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: CsvRowData = {
      materialId: '',
      cost: 0,
      impressions: 0,
      clicks: 0,
      clickRate: 0,
      cpm: 0,
      conversions: 0,
      conversionCost: 0,
      activations: 0,
      dailyPayment: 0,
      materialScore: 0,
    }

    // 填充数据
    if (columnIndices.materialId !== undefined) {
      row.materialId = values[columnIndices.materialId]?.trim() || ''
    }
    if (columnIndices.cost !== undefined) {
      row.cost = parseFloat(values[columnIndices.cost]) || 0
    }
    if (columnIndices.impressions !== undefined) {
      row.impressions = parseInt(values[columnIndices.impressions]) || 0
    }
    if (columnIndices.clicks !== undefined) {
      row.clicks = parseInt(values[columnIndices.clicks]) || 0
    }
    if (columnIndices.clickRate !== undefined) {
      row.clickRate = parseFloat(values[columnIndices.clickRate]) || 0
    }
    if (columnIndices.cpm !== undefined) {
      row.cpm = parseFloat(values[columnIndices.cpm]) || 0
    }
    if (columnIndices.conversions !== undefined) {
      row.conversions = parseInt(values[columnIndices.conversions]) || 0
    }
    if (columnIndices.conversionCost !== undefined) {
      row.conversionCost = parseFloat(values[columnIndices.conversionCost]) || 0
    }
    if (columnIndices.activations !== undefined) {
      row.activations = parseInt(values[columnIndices.activations]) || 0
    }
    if (columnIndices.dailyPayment !== undefined) {
      row.dailyPayment = parseFloat(values[columnIndices.dailyPayment]) || 0
    }
    if (columnIndices.materialScore !== undefined) {
      row.materialScore = parseFloat(values[columnIndices.materialScore]) || 0
    }

    // 只添加有素材ID的行
    if (row.materialId) {
      data.push(row)
    }
  }

  return data
}

// 解析 CSV 行（处理引号内的逗号）
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

export function CsvImportModal({ isOpen, csvFile, onClose, onImport }: CsvImportModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [isImporting, setIsImporting] = useState(false)
  const [previewData, setPreviewData] = useState<CsvRowData[]>([])
  const [error, setError] = useState<string | null>(null)

  // 解析 CSV 文件
  const parseFile = useCallback(async () => {
    if (!csvFile) return

    try {
      const content = await csvFile.text()
      const data = parseCsv(content)
      setPreviewData(data)
      setError(null)
    } catch (err) {
      console.error('解析 CSV 失败:', err)
      setError('解析 CSV 文件失败')
      setPreviewData([])
    }
  }, [csvFile])

  // 当文件变化时解析
  useState(() => {
    if (csvFile) {
      parseFile()
    }
  })

  // 监听文件变化
  if (csvFile && previewData.length === 0 && !error) {
    parseFile()
  }

  const handleImport = async () => {
    if (!selectedDate || previewData.length === 0) return

    setIsImporting(true)
    try {
      await onImport(selectedDate, previewData)
      onClose()
    } catch (err) {
      console.error('导入失败:', err)
      setError('导入数据失败')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">导入 CSV 数据</h2>
          <p className="text-sm text-gray-500 mt-1">
            文件: {csvFile?.name}
          </p>
        </div>

        <div className="p-4">
          {/* 日期选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择数据日期
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 数据预览 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据预览 ({previewData.length} 条记录)
            </label>
            <div className="max-h-[300px] overflow-auto border border-gray-200 rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border-b">素材ID</th>
                    <th className="text-right p-2 border-b">消耗</th>
                    <th className="text-right p-2 border-b">展示</th>
                    <th className="text-right p-2 border-b">点击</th>
                    <th className="text-right p-2 border-b">转化</th>
                    <th className="text-right p-2 border-b">激活</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-2">{row.materialId}</td>
                      <td className="text-right p-2">{row.cost.toFixed(2)}</td>
                      <td className="text-right p-2">{row.impressions}</td>
                      <td className="text-right p-2">{row.clicks}</td>
                      <td className="text-right p-2">{row.conversions}</td>
                      <td className="text-right p-2">{row.activations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 20 && (
                <div className="p-2 text-center text-gray-500 text-xs">
                  ... 还有 {previewData.length - 20} 条数据
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isImporting}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || previewData.length === 0}
          >
            {isImporting ? '导入中...' : `导入 ${previewData.length} 条数据`}
          </Button>
        </div>
      </div>
    </div>
  )
}
