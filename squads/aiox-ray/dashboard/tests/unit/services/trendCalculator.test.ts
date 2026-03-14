import { describe, it, expect } from 'vitest'
import { calculateTrend } from '../../../src/services/trendCalculator'
import { Event } from '../../../src/stores/eventStore'

describe('trendCalculator', () => {
  it('should handle empty events', () => {
    const trend = calculateTrend([], 'executions')
    expect(trend.current).toBe(0)
    expect(trend.sevenDayAvg).toBe(0)
    expect(trend.percentChange).toBe(0)
    expect(trend.sparklineData.length).toBe(7)
    expect(trend.sparklineData.every(v => v === 0)).toBe(true)
  })

  it('should calculate executions trend', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: today.toISOString(),
      },
      {
        event_id: '2',
        event_type: 'agent.started',
        agent_id: 'qa',
        execution_id: 'exec-2',
        timestamp: today.toISOString(),
      },
      {
        event_id: '3',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-3',
        timestamp: today.toISOString(),
      },
    ]

    const trend = calculateTrend(events, 'executions')
    expect(trend.current).toBe(3)
    expect(trend.sparklineData[6]).toBe(3) // Today is the 7th day (index 6)
  })

  it('should calculate duration trend', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: today.toISOString(),
        duration_ms: 1000,
      },
      {
        event_id: '2',
        event_type: 'agent.finished',
        agent_id: 'dev',
        execution_id: 'exec-2',
        timestamp: today.toISOString(),
        duration_ms: 3000,
      },
    ]

    const trend = calculateTrend(events, 'duration')
    expect(trend.current).toBe(2000) // Average of 1000 and 3000
    expect(trend.sparklineData[6]).toBe(2000)
  })

  it('should calculate error rate trend', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events: Event[] = [
      {
        event_id: '1',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: today.toISOString(),
      },
      {
        event_id: '2',
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: 'exec-2',
        timestamp: today.toISOString(),
      },
      {
        event_id: '3',
        event_type: 'error.occurred',
        agent_id: 'dev',
        execution_id: 'exec-1',
        timestamp: today.toISOString(),
      },
    ]

    const trend = calculateTrend(events, 'errorRate')
    expect(trend.current).toBe(50) // 1 error out of 2 executions
    expect(trend.sparklineData[6]).toBe(50)
  })

  it('should calculate trend with historical data', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events: Event[] = []

    // Add 1 execution for each of the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      events.push({
        event_id: `${i}`,
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: `exec-${i}`,
        timestamp: date.toISOString(),
      })
    }

    const trend = calculateTrend(events, 'executions')
    expect(trend.current).toBe(1) // Today only
    expect(trend.sevenDayAvg).toBe(1) // Average of 1 per day
    expect(trend.sparklineData.length).toBe(7)
    expect(trend.sparklineData.every(v => v === 1 || v === 0)).toBe(true)
  })

  it('should calculate percent change correctly', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events: Event[] = []

    // 5 executions today
    for (let i = 0; i < 5; i++) {
      events.push({
        event_id: `${i}`,
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: `exec-${i}`,
        timestamp: today.toISOString(),
      })
    }

    // 1 execution per day for previous 6 days
    for (let i = 0; i < 6; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i - 1)

      events.push({
        event_id: `prev-${i}`,
        event_type: 'agent.started',
        agent_id: 'dev',
        execution_id: `exec-prev-${i}`,
        timestamp: date.toISOString(),
      })
    }

    const trend = calculateTrend(events, 'executions')
    expect(trend.current).toBe(5)
    // 7-day average: (5 + 1 + 1 + 1 + 1 + 1 + 1) / 7 = 11/7 ≈ 1.57
    const expectedAvg = 11 / 7
    expect(trend.sevenDayAvg).toBeCloseTo(expectedAvg, 1)
    // Percent change: (5 - 1.57) / 1.57 * 100 ≈ 218%
    const expectedPercentChange = ((5 - expectedAvg) / expectedAvg) * 100
    expect(trend.percentChange).toBeCloseTo(expectedPercentChange, 0)
  })
})
