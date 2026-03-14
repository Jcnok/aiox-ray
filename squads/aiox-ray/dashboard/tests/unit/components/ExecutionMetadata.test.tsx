import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExecutionMetadata } from '../../../src/components/ExecutionMetadata'
import type { ExecutionDetail } from '../../../src/services/executionDetailBuilder'

const mockDetail: ExecutionDetail = {
  execution_id: 'exec-abc-123',
  agent_id: 'orchestrator',
  status: 'success',
  started_at: '2026-03-14T10:00:00Z',
  finished_at: '2026-03-14T10:00:05Z',
  duration_ms: 5000,
  raw_events: [],
}

describe('ExecutionMetadata', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('displays execution ID', () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    expect(screen.getByText('exec-abc-123')).toBeTruthy()
  })

  it('displays agent ID', () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    expect(screen.getByText('orchestrator')).toBeTruthy()
  })

  it('displays status with color indicator', () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    expect(screen.getByText('success')).toBeTruthy()
    const indicator = screen.getByTestId('status-indicator')
    expect(indicator.className).toContain('bg-green-500')
  })

  it('displays error status with red indicator', () => {
    render(<ExecutionMetadata detail={{ ...mockDetail, status: 'error' }} />)
    const indicator = screen.getByTestId('status-indicator')
    expect(indicator.className).toContain('bg-red-500')
  })

  it('displays duration', () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    expect(screen.getByText('5.0s')).toBeTruthy()
  })

  it('displays timestamps', () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    expect(screen.getByText('2026-03-14T10:00:00Z')).toBeTruthy()
    expect(screen.getByText('2026-03-14T10:00:05Z')).toBeTruthy()
  })

  it('hides duration when undefined', () => {
    render(<ExecutionMetadata detail={{ ...mockDetail, duration_ms: undefined }} />)
    expect(screen.queryByText('Duration')).toBeNull()
  })

  it('copies execution ID on button click', async () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    const copyBtn = screen.getByTestId('copy-execution-id')
    fireEvent.click(copyBtn)
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('exec-abc-123')
    })
  })

  it('shows Copied! after clicking copy', async () => {
    render(<ExecutionMetadata detail={mockDetail} />)
    const copyBtn = screen.getByTestId('copy-execution-id')
    expect(copyBtn.textContent).toBe('Copy')
    fireEvent.click(copyBtn)
    await waitFor(() => {
      expect(copyBtn.textContent).toBe('Copied!')
    })
  })
})
