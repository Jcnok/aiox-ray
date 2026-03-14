import React from 'react'
import MetricCard from './MetricCard'

export interface Metrics {
  totalExecutions: number
  avgDuration: number
  errorRate: number
  agentCounts: Record<string, number>
}

export interface TrendData {
  current: number
  sevenDayAvg: number
  percentChange: number
}

interface MetricsCardsProps {
  metrics: Metrics
  trends?: {
    executions?: TrendData
    duration?: TrendData
    errorRate?: TrendData
  }
  onCardClick?: (cardType: string) => void
}

export default function MetricsCards({
  metrics,
  trends,
  onCardClick,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Executions */}
      <MetricCard
        title="Total Executions"
        value={metrics.totalExecutions}
        unit="today"
        trend={trends?.executions ? 'trend' : undefined}
        trendPercent={trends?.executions?.percentChange}
        isPositiveTrend={(trends?.executions?.percentChange ?? 0) > 0}
        onClick={() => onCardClick?.('executions')}
      />

      {/* Avg Duration */}
      <MetricCard
        title="Avg Duration"
        value={metrics.avgDuration.toFixed(2)}
        unit="seconds"
        trend={trends?.duration ? 'trend' : undefined}
        trendPercent={trends?.duration?.percentChange}
        isPositiveTrend={(trends?.duration?.percentChange ?? 0) < 0} // Lower is better
        onClick={() => onCardClick?.('duration')}
      />

      {/* Error Rate */}
      <MetricCard
        title="Error Rate"
        value={metrics.errorRate.toFixed(1)}
        unit="%"
        trend={trends?.errorRate ? 'trend' : undefined}
        trendPercent={trends?.errorRate?.percentChange}
        isPositiveTrend={(trends?.errorRate?.percentChange ?? 0) < 0} // Lower is better
        onClick={() => onCardClick?.('errorRate')}
      />

      {/* Agent Count */}
      <MetricCard
        title="Agents Active"
        value={Object.keys(metrics.agentCounts).length}
        unit="types"
        onClick={() => onCardClick?.('agents')}
      />
    </div>
  )
}
