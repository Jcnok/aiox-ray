import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineView } from '../../../src/components/TimelineView'
import type { TimelineData } from '../../../src/services/timelineCalculator'

describe('TimelineView', () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  const mockTimelineData: TimelineData = {
    buckets: [
      {
        bucket_time: oneHourAgo,
        bucket_id: `${oneHourAgo}-30min`,
        executions: [
          {
            execution_id: 'exec-1',
            agent_id: 'agent-a',
            start_time: oneHourAgo,
            end_time: now.toISOString(),
            duration_ms: 3600000,
            status: 'success',
            event_count: 5,
          },
        ],
      },
    ],
    agents: ['agent-a'],
    earliest_time: oneHourAgo,
    latest_time: now.toISOString(),
    total_executions: 1,
  }

  it('renders loading state', () => {
    render(<TimelineView isLoading={true} />)
    expect(screen.getByText('Loading timeline...')).toBeDefined()
  })

  it('renders empty state when no data', () => {
    render(<TimelineView />)
    expect(screen.getByText('No execution data available')).toBeDefined()
  })

  it('renders empty state when total_executions is 0', () => {
    const emptyData: TimelineData = {
      buckets: [],
      agents: [],
      earliest_time: now.toISOString(),
      latest_time: now.toISOString(),
      total_executions: 0,
    }
    render(<TimelineView timelineData={emptyData} />)
    expect(screen.getByText('No execution data available')).toBeDefined()
  })

  it('renders timeline with data', () => {
    const { container } = render(<TimelineView timelineData={mockTimelineData} />)
    // Should render the main container
    const wrapper = container.querySelector('.bg-gray-900')
    expect(wrapper).toBeDefined()
    expect(wrapper).not.toBeNull()
  })

  it('renders TimeAxis and TimelineGrid when data exists', () => {
    const { container } = render(<TimelineView timelineData={mockTimelineData} />)
    // The flex container should have TimeAxis (w-24) and TimelineGrid (flex-1)
    const flexContainer = container.querySelector('.flex.h-auto')
    expect(flexContainer).not.toBeNull()
    expect(flexContainer?.children.length).toBe(2)
  })
})
