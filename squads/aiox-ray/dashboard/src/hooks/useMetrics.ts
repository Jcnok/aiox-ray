import { useEffect, useState, useMemo } from 'react'
import { useEventStore, Event } from '../stores/eventStore'
import { calculateMetrics, Metrics } from '../services/metricsCalculator'
import { calculateTrend, TrendData } from '../services/trendCalculator'

export interface UseMetricsReturn {
  metrics: Metrics
  trends: {
    executions?: TrendData
    duration?: TrendData
    errorRate?: TrendData
  }
  isLoading: boolean
}

/**
 * Hook to calculate and update metrics from eventStore every 5 seconds
 */
export function useMetrics(updateInterval: number = 5000): UseMetricsReturn {
  const events = useEventStore((state) => state.events)
  const [metrics, setMetrics] = useState<Metrics>({
    totalExecutions: 0,
    avgDuration: 0,
    errorRate: 0,
    agentCounts: {},
  })
  const [trends, setTrends] = useState<UseMetricsReturn['trends']>({})
  const [isLoading, setIsLoading] = useState(false)

  // Calculate metrics and trends
  useEffect(() => {
    const calculateAndUpdateMetrics = () => {
      try {
        setIsLoading(true)

        // Calculate current metrics
        const newMetrics = calculateMetrics(events)
        setMetrics(newMetrics)

        // Calculate trends
        const executionsTrend = calculateTrend(events, 'executions')
        const durationTrend = calculateTrend(events, 'duration')
        const errorRateTrend = calculateTrend(events, 'errorRate')

        setTrends({
          executions: executionsTrend,
          duration: durationTrend,
          errorRate: errorRateTrend,
        })

        setIsLoading(false)
      } catch (error) {
        console.error('Error calculating metrics:', error)
        setIsLoading(false)
      }
    }

    // Initial calculation
    calculateAndUpdateMetrics()

    // Set up interval
    const interval = setInterval(calculateAndUpdateMetrics, updateInterval)

    // Cleanup
    return () => clearInterval(interval)
  }, [events, updateInterval])

  return {
    metrics,
    trends,
    isLoading,
  }
}
