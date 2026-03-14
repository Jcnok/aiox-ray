import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CotTimeline } from '../../../src/components/CotTimeline'
import type { CotMilestone } from '../../../src/services/executionDetailBuilder'

describe('CotTimeline', () => {
  it('renders empty state when no milestones', () => {
    render(<CotTimeline milestones={[]} />)
    expect(screen.getByTestId('cot-empty')).toBeTruthy()
    expect(screen.getByText('No Chain of Thought data available for this execution')).toBeTruthy()
  })

  it('renders milestones', () => {
    const milestones: CotMilestone[] = [
      { milestone: 'Analyzing problem', timestamp: '2026-03-14T10:00:01Z', order_index: 1 },
      { milestone: 'Exploring codebase', timestamp: '2026-03-14T10:00:02Z', order_index: 2 },
    ]
    render(<CotTimeline milestones={milestones} />)
    expect(screen.getByText('Analyzing problem')).toBeTruthy()
    expect(screen.getByText('Exploring codebase')).toBeTruthy()
  })

  it('displays timestamps for each milestone', () => {
    const milestones: CotMilestone[] = [
      { milestone: 'Step 1', timestamp: '2026-03-14T10:00:01Z', order_index: 1 },
    ]
    render(<CotTimeline milestones={milestones} />)
    expect(screen.getByText('2026-03-14T10:00:01Z')).toBeTruthy()
  })

  it('renders timeline indicators (dots)', () => {
    const milestones: CotMilestone[] = [
      { milestone: 'A', timestamp: 't1', order_index: 1 },
      { milestone: 'B', timestamp: 't2', order_index: 2 },
      { milestone: 'C', timestamp: 't3', order_index: 3 },
    ]
    render(<CotTimeline milestones={milestones} />)
    expect(screen.getByTestId('cot-milestone-0')).toBeTruthy()
    expect(screen.getByTestId('cot-milestone-1')).toBeTruthy()
    expect(screen.getByTestId('cot-milestone-2')).toBeTruthy()
  })

  it('renders single milestone without connector line', () => {
    const milestones: CotMilestone[] = [
      { milestone: 'Only one', timestamp: 't1', order_index: 1 },
    ]
    render(<CotTimeline milestones={milestones} />)
    expect(screen.getByTestId('cot-timeline')).toBeTruthy()
    expect(screen.getByText('Only one')).toBeTruthy()
  })
})
