import React from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: string
  trendPercent?: number
  onClick?: () => void
  isPositiveTrend?: boolean
}

export default function MetricCard({
  title,
  value,
  unit,
  trend,
  trendPercent,
  onClick,
  isPositiveTrend = true,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-gray-900 border border-gray-700 rounded-lg p-6
        hover:border-blue-500 hover:shadow-lg transition-all
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-400 mb-4">{title}</h3>

      {/* Value */}
      <div className="mb-4">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-500 ml-2">{unit}</span>}
      </div>

      {/* Trend */}
      {trend && trendPercent !== undefined && (
        <div className="flex items-center gap-2">
          <span className={`text-lg ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveTrend ? '↑' : '↓'}
          </span>
          <span className={`text-sm ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(trendPercent).toFixed(1)}% from 7d avg
          </span>
        </div>
      )}

      {/* Sparkline placeholder (will be replaced with actual sparkline) */}
      {trend && (
        <div className="mt-4 h-8 bg-gray-800 rounded" />
      )}
    </div>
  )
}
