import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { NodeDetail } from '../../../src/components/NodeDetail'
import type { FlowNodeData } from '../../../src/services/graphBuilder'

const baseData: FlowNodeData = {
  agent_id: 'dev',
  node_type: 'agent',
  total_calls: 10,
  avg_duration_ms: 500,
  error_count: 0,
  error_rate: 0,
  total_duration_ms: 5000,
  status: 'success',
  label: 'dev',
}

describe('NodeDetail', () => {
  it('should render tooltip container', () => {
    render(<NodeDetail data={baseData} position={{ x: 100, y: 200 }} />)
    expect(screen.getByTestId('node-detail-tooltip')).toBeDefined()
  })

  it('should display agent name', () => {
    render(<NodeDetail data={baseData} position={{ x: 100, y: 200 }} />)
    expect(screen.getByText('dev')).toBeDefined()
  })

  it('should display total calls', () => {
    render(<NodeDetail data={baseData} position={{ x: 100, y: 200 }} />)
    expect(screen.getByText('10')).toBeDefined()
  })

  it('should format duration in ms', () => {
    render(<NodeDetail data={{ ...baseData, avg_duration_ms: 150 }} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('150ms')).toBeDefined()
  })

  it('should format duration in seconds', () => {
    render(<NodeDetail data={{ ...baseData, avg_duration_ms: 2500 }} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('2.5s')).toBeDefined()
  })

  it('should format duration in minutes', () => {
    render(<NodeDetail data={{ ...baseData, avg_duration_ms: 120000 }} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('2.0m')).toBeDefined()
  })

  it('should show agent icon for agent nodes', () => {
    render(<NodeDetail data={baseData} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('🤖')).toBeDefined()
  })

  it('should show skill icon for skill nodes', () => {
    render(<NodeDetail data={{ ...baseData, node_type: 'skill' }} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('⚡')).toBeDefined()
  })

  it('should show error rate as percentage', () => {
    render(<NodeDetail data={{ ...baseData, error_rate: 0.15 }} position={{ x: 0, y: 0 }} />)
    expect(screen.getByText('15.0%')).toBeDefined()
  })

  it('should position tooltip near cursor', () => {
    render(<NodeDetail data={baseData} position={{ x: 100, y: 200 }} />)
    const tooltip = screen.getByTestId('node-detail-tooltip')
    expect(tooltip.style.left).toBe('110px')
    expect(tooltip.style.top).toBe('210px')
  })
})
