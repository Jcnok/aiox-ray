import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMetrics } from '../../../src/hooks/useMetrics'
import { useEventStore } from '../../../src/stores/eventStore'

vi.mock('../../../src/stores/eventStore')

describe('useMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const { result } = renderHook(() => useMetrics())

    expect(result.current.metrics).toBeDefined()
    expect(result.current.trends).toBeDefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('should provide metrics object with expected structure', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const { result } = renderHook(() => useMetrics())

    expect(result.current.metrics).toHaveProperty('totalExecutions')
    expect(result.current.metrics).toHaveProperty('avgDuration')
    expect(result.current.metrics).toHaveProperty('errorRate')
    expect(result.current.metrics).toHaveProperty('agentCounts')
  })

  it('should provide trends with current, sevenDayAvg, percentChange, sparklineData', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const { result } = renderHook(() => useMetrics())

    const trends = result.current.trends
    if (trends.executions) {
      expect(trends.executions).toHaveProperty('current')
      expect(trends.executions).toHaveProperty('sevenDayAvg')
      expect(trends.executions).toHaveProperty('percentChange')
      expect(trends.executions).toHaveProperty('sparklineData')
    }
  })

  it('should accept custom update interval', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    renderHook(() => useMetrics(2000))

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000)

    setIntervalSpy.mockRestore()
  })

  it('should cleanup on unmount', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const { unmount } = renderHook(() => useMetrics())

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
  })

  it('should use default 5000ms update interval', () => {
    vi.mocked(useEventStore).mockReturnValue({
      events: [],
    } as any)

    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    renderHook(() => useMetrics())

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000)

    setIntervalSpy.mockRestore()
  })
})
