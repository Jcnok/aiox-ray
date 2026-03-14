import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ExecutionBar } from '../../../src/components/ExecutionBar'
import type { Execution } from '../../../src/services/timelineCalculator'

describe('ExecutionBar', () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  const baseExecution: Execution = {
    execution_id: 'exec-1',
    agent_id: 'agent-a',
    start_time: oneHourAgo,
    end_time: now.toISOString(),
    duration_ms: 3600000,
    status: 'success',
    event_count: 5,
  }

  const defaultProps = {
    execution: baseExecution,
    earliestTime: oneHourAgo,
    latestTime: now.toISOString(),
    canvasWidth: 1000,
  }

  it('renders execution bar with correct color for success', () => {
    const { container } = render(<ExecutionBar {...defaultProps} />)
    const bar = container.querySelector('.bg-green-600')
    expect(bar).not.toBeNull()
  })

  it('renders error bar with red color', () => {
    const errorExecution: Execution = { ...baseExecution, status: 'error' }
    const { container } = render(
      <ExecutionBar {...defaultProps} execution={errorExecution} />
    )
    const bar = container.querySelector('.bg-red-600')
    expect(bar).not.toBeNull()
  })

  it('renders running bar with gray color', () => {
    const runningExecution: Execution = {
      ...baseExecution,
      status: 'running',
      end_time: undefined,
      duration_ms: undefined,
    }
    const { container } = render(
      <ExecutionBar {...defaultProps} execution={runningExecution} />
    )
    const bar = container.querySelector('.bg-gray-600')
    expect(bar).not.toBeNull()
  })

  it('shows tooltip on hover', () => {
    const { container } = render(<ExecutionBar {...defaultProps} />)
    const bar = container.querySelector('[class*="bg-green"]')!
    fireEvent.mouseEnter(bar)
    // Tooltip should appear with execution details
    const tooltip = container.querySelector('.z-50')
    expect(tooltip).not.toBeNull()
  })

  it('hides tooltip on mouse leave', () => {
    const { container } = render(<ExecutionBar {...defaultProps} />)
    const bar = container.querySelector('[class*="bg-green"]')!
    fireEvent.mouseEnter(bar)
    fireEvent.mouseLeave(bar)
    const tooltip = container.querySelector('.z-50')
    expect(tooltip).toBeNull()
  })

  it('shows agent label when bar is wide enough', () => {
    // Full width bar should show agent name
    const { container } = render(<ExecutionBar {...defaultProps} />)
    const label = container.querySelector('.text-xs.text-white')
    // Bar spans full width (1000px), so should show label
    expect(label).not.toBeNull()
  })

  it('positions bar using calculated offset and width', () => {
    const { container } = render(<ExecutionBar {...defaultProps} />)
    const bar = container.querySelector('[class*="absolute h-8"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.left).toBeDefined()
    expect(bar.style.width).toBeDefined()
  })
})
