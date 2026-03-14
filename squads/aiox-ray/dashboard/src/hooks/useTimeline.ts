import { useEffect, useState } from 'react'
import { useEventStore } from '../stores/eventStore'
import { calculateTimeline, type TimelineData } from '../services/timelineCalculator'

export interface UseTimelineReturn {
  timelineData: TimelineData
  executions: TimelineData['buckets'][0]['executions']
  agents: string[]
  isLoading: boolean
}

const EMPTY_TIMELINE: TimelineData = {
  buckets: [],
  agents: [],
  earliest_time: new Date().toISOString(),
  latest_time: new Date().toISOString(),
  total_executions: 0,
}

/**
 * Hook to calculate and update timeline data from eventStore
 * More responsive than useMetrics (2-second default vs 5-second)
 */
export function useTimeline(
  bucketSize: 'hour' | '30min' = '30min',
  updateInterval: number = 2000
): UseTimelineReturn {
  const events = useEventStore((state) => state.events)
  const [timelineData, setTimelineData] = useState<TimelineData>(EMPTY_TIMELINE)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const calculateAndUpdate = () => {
      try {
        setIsLoading(true)
        const data = calculateTimeline(events, bucketSize)
        setTimelineData(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error calculating timeline:', error)
        setIsLoading(false)
      }
    }

    calculateAndUpdate()

    const interval = setInterval(calculateAndUpdate, updateInterval)

    return () => clearInterval(interval)
  }, [events, bucketSize, updateInterval])

  const executions = timelineData.buckets.flatMap((b) => b.executions)

  return {
    timelineData,
    executions,
    agents: timelineData.agents,
    isLoading,
  }
}
