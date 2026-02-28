'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import type { MetricsSummary, DailyMetrics } from '@/types/api'

interface MetricsDisplayProps {
  summary?: MetricsSummary
  dailyMetrics?: DailyMetrics[]
}

// 格式化数字
function formatNumber(num: number, decimals = 0): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toFixed(decimals)
}

// 格式化金额
function formatMoney(num: number): string {
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(2) + 'w'
  }
  return '¥' + num.toFixed(2)
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function MetricsDisplay({ summary, dailyMetrics }: MetricsDisplayProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 })
  const previewRef = useRef<HTMLDivElement>(null)

  // 调整预览位置
  useLayoutEffect(() => {
    if (showPreview && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let x = previewPosition.x + 20
      let y = previewPosition.y - 20

      // 确保不超出右边界
      if (x + rect.width > viewportWidth - 20) {
        x = previewPosition.x - rect.width - 20
      }
      // 确保不超出底部
      if (y + rect.height > viewportHeight - 20) {
        y = viewportHeight - rect.height - 20
      }
      // 确保不超出顶部
      if (y < 20) {
        y = 20
      }

      setAdjustedPosition({ x, y })
    }
  }, [showPreview, previewPosition])

  const handleMouseEnter = (e: React.MouseEvent) => {
    setPreviewPosition({ x: e.clientX, y: e.clientY })
    setShowPreview(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setPreviewPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setShowPreview(false)
  }

  // 如果没有数据，显示占位符
  if (!summary || !dailyMetrics || dailyMetrics.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        暂无数据
      </div>
    )
  }

  // 重要指标：消耗，展示数，点击率(%)，平均千次展现费用(元)，转化数，激活数，计费当日付费金额，素材评估
  return (
    <>
      <div
        className="flex items-center gap-3 text-sm cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-gray-500">
          消耗:<span className="text-gray-900 ml-1">{formatMoney(summary.totalCost)}</span>
        </span>
        <span className="text-gray-500">
          展示:<span className="text-gray-900 ml-1">{formatNumber(summary.totalImpressions)}</span>
        </span>
        <span className="text-gray-500">
          点击率:<span className="text-gray-900 ml-1">{summary.avgClickRate.toFixed(2)}%</span>
        </span>
        <span className="text-gray-500">
          CPM:<span className="text-gray-900 ml-1">{formatMoney(summary.avgCpm)}</span>
        </span>
        <span className="text-gray-500">
          转化:<span className="text-gray-900 ml-1">{formatNumber(summary.totalConversions)}</span>
        </span>
        {summary.avgRoi > 0 && (
          <span className="text-gray-500">
            ROI:<span className="text-gray-900 ml-1">{summary.avgRoi.toFixed(2)}</span>
          </span>
        )}
        <span className="text-gray-500">
          激活:<span className="text-gray-900 ml-1">{formatNumber(summary.totalActivations)}</span>
        </span>
        <span className="text-gray-500">
          付费:<span className="text-gray-900 ml-1">{formatMoney(summary.totalDailyPayment)}</span>
        </span>
        <span className="text-gray-500">
          评估:<span className="text-gray-900 ml-1">{summary.avgMaterialScore.toFixed(1)}</span>
        </span>
      </div>

      {/* 详细数据预览 */}
      {showPreview && (
        <div
          ref={previewRef}
          className="fixed z-50 pointer-events-none"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-[600px] max-h-[80vh] overflow-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">每日数据详情</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-2 text-gray-500 font-medium">日期</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">消耗</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">展示</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">点击</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">点击率</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">CPM</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">转化</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">转化成本</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">ROI</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">激活</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">付费</th>
                  <th className="text-right py-1 px-2 text-gray-500 font-medium">评估</th>
                </tr>
              </thead>
              <tbody>
                {dailyMetrics.map((metric) => (
                  <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1 px-2 text-gray-700">{formatDate(metric.date)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatMoney(metric.cost)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatNumber(metric.impressions)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatNumber(metric.clicks)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{metric.clickRate.toFixed(2)}%</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatMoney(metric.cpm)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatNumber(metric.conversions)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatMoney(metric.conversionCost)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{metric.roi > 0 ? metric.roi.toFixed(2) : '-'}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatNumber(metric.activations)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{formatMoney(metric.dailyPayment)}</td>
                    <td className="text-right py-1 px-2 text-gray-900">{metric.materialScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
