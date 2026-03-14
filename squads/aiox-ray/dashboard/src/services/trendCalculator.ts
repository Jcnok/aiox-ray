import { Event } from '../stores/eventStore'

export interface TrendData {
  current: number
  sevenDayAvg: number
  percentChange: number
  sparklineData: number[]
}

/**
 * Calculate 7-day trend for a specific metric
 */
export function calculateTrend(
  events: Event[],
  metric: 'executions' | 'duration' | 'errorRate'
): TrendData {
  if (!events || events.length === 0) {
    return {
      current: 0,
      sevenDayAvg: 0,
      percentChange: 0,
      sparklineData: Array(7).fill(0),
    }
  }

  // Group events by day (last 7 days)
  const now = new Date()
  const dailyMetrics: number[] = []

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now)
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const dayEvents = events.filter((e) => {
      const eventTime = new Date(e.timestamp)
      return eventTime >= dayStart && eventTime <= dayEnd
    })

    let dayValue = 0
    if (metric === 'executions') {
      dayValue = dayEvents.filter((e) => e.event_type === 'agent.started').length
    } else if (metric === 'duration') {
      const finishedEvents = dayEvents.filter((e) => e.event_type === 'agent.finished' && e.duration_ms)
      dayValue =
        finishedEvents.length > 0
          ? finishedEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / finishedEvents.length
          : 0
    } else if (metric === 'errorRate') {
      const started = dayEvents.filter((e) => e.event_type === 'agent.started').length
      const errors = dayEvents.filter((e) => e.event_type === 'error.occurred').length
      dayValue = started > 0 ? (errors / started) * 100 : 0
    }

    dailyMetrics.push(dayValue)
  }

  // Calculate current (today's value is the last day)
  const current = dailyMetrics[dailyMetrics.length - 1]

  // Calculate 7-day average
  const sevenDayAvg = dailyMetrics.reduce((sum, val) => sum + val, 0) / dailyMetrics.length

  // Calculate percent change
  const percentChange = sevenDayAvg > 0 ? ((current - sevenDayAvg) / sevenDayAvg) * 100 : 0

  return {
    current,
    sevenDayAvg,
    percentChange,
    sparklineData: dailyMetrics,
  }
}
