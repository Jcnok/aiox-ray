import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDisplay } from '../../../src/components/ErrorDisplay'
import type { ErrorInfo } from '../../../src/services/executionDetailBuilder'

describe('ErrorDisplay', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders empty state when no error', () => {
    render(<ErrorDisplay />)
    expect(screen.getByTestId('error-empty')).toBeTruthy()
    expect(screen.getByText('No errors')).toBeTruthy()
  })

  it('renders error message', () => {
    const error: ErrorInfo = {
      message: 'Connection timeout',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    expect(screen.getByText('Connection timeout')).toBeTruthy()
  })

  it('renders error timestamp', () => {
    const error: ErrorInfo = {
      message: 'fail',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    expect(screen.getByText('2026-03-14T10:00:03Z')).toBeTruthy()
  })

  it('renders stack trace when available', () => {
    const error: ErrorInfo = {
      message: 'Error',
      stack: 'Error: Something\n  at foo.ts:10',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    expect(screen.getByTestId('error-stack')).toBeTruthy()
    expect(screen.getByText(/at foo.ts:10/)).toBeTruthy()
  })

  it('does not render stack when not available', () => {
    const error: ErrorInfo = {
      message: 'Simple error',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    expect(screen.queryByTestId('error-stack')).toBeNull()
  })

  it('has red styling', () => {
    const error: ErrorInfo = {
      message: 'Error',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    const container = screen.getByTestId('error-display')
    expect(container.className).toContain('border-red-700')
  })

  it('copies error trace on button click', () => {
    const error: ErrorInfo = {
      message: 'Error',
      stack: 'trace here',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    const copyBtn = screen.getByTestId('copy-error-trace')
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('trace here')
  })

  it('copies message when no stack on trace copy', () => {
    const error: ErrorInfo = {
      message: 'Error msg',
      timestamp: '2026-03-14T10:00:03Z',
    }
    render(<ErrorDisplay error={error} />)
    const copyBtn = screen.getByTestId('copy-error-trace')
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Error msg')
  })
})
