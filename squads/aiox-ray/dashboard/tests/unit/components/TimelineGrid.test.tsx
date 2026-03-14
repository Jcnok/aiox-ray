import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineGrid } from '../../../src/components/TimelineGrid'
import type { TimelineData } from '../../../src/services/timelineCalculator'

describe('TimelineGrid', () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  const mockTimelineData: TimelineData = {
    buckets: [
      {
        bucket_time: twoHoursAgo,
        bucket_id: `${twoHoursAgo}-30min`,
        executions: [
          {
            execution_id: 'exec-1',
            agent_id: 'agent-a',
            start_time: twoHoursAgo,
            end_time: oneHourAgo,
            duration_ms: 3600000,
            status: 'success',
            event_count: 5,
          },
          {
            execution_id: 'exec-2',
            agent_id: 'agent-b',
            start_time: twoHoursAgo,
            end_time: now.toISOString(),
            duration_ms: 7200000,
            status: 'error',
            event_count: 3,
          },
        ],
      },
      {
        bucket_time: oneHourAgo,
        bucket_id: `${oneHourAgo}-30min`,
        executions: [
          {
            execution_id: 'exec-3',
            agent_id: 'agent-a',
            start_time: oneHourAgo,
            end_time: now.toISOString(),
            duration_ms: 3600000,
            status: 'running',
            event_count: 2,
          },
        ],
      },
    ],
    agents: ['agent-a', 'agent-b'],
    earliest_time: twoHoursAgo,
    latest_time: now.toISOString(),
    total_executions: 3,
  }

  it('renders agent lanes for each agent', () => {
    const { container } = render(
      <TimelineGrid
        timelineData={mockTimelineData}
        earliestTime={twoHoursAgo}
        latestTime={now.toISOString()}
      />
    )
    // Should have agent labels (may appear multiple times: lane label + bar label)
    expect(screen.getAllByText('agent-a').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('agent-b').length).toBeGreaterThanOrEqual(1)
  })

  it('renders execution bars for each execution', () => {
    const { container } = render(
      <TimelineGrid
        timelineData={mockTimelineData}
        earliestTime={twoHoursAgo}
        latestTime={now.toISOString()}
      />
    )
    // Should have 3 execution bars (success green + error red + running gray)
    const greenBars = container.querySelectorAll('[class*="bg-green-600"]')
    const redBars = container.querySelectorAll('[class*="bg-red-600"]')
    const grayBars = container.querySelectorAll('[class*="bg-gray-600"]')
    expect(greenBars.length + redBars.length + grayBars.length).toBe(3)
  })

  it('supports horizontal scrolling', () => {
    const { container } = render(
      <TimelineGrid
        timelineData={mockTimelineData}
        earliestTime={twoHoursAgo}
        latestTime={now.toISOString()}
      />
    )
    const scrollContainer = container.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
  })

  it('renders empty state when no agents', () => {
    const emptyData: TimelineData = {
      buckets: [],
      agents: [],
      earliest_time: now.toISOString(),
      latest_time: now.toISOString(),
      total_executions: 0,
    }
    const { container } = render(
      <TimelineGrid
        timelineData={emptyData}
        earliestTime={now.toISOString()}
        latestTime={now.toISOString()}
      />
    )
    expect(screen.getByText('No agent lanes to display')).toBeDefined()
  })

  it('sets correct lane heights based on agent count', () => {
    const { container } = render(
      <TimelineGrid
        timelineData={mockTimelineData}
        earliestTime={twoHoursAgo}
        latestTime={now.toISOString()}
      />
    )
    // 2 agents × 48px = 96px min-height
    const gridContent = container.querySelector('.relative') as HTMLElement
    expect(gridContent).not.toBeNull()
    expect(gridContent.style.minHeight).toBe('96px')
  })
})
