import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '../../../src/stores/filterStore'

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      agentId: null,
      startTime: null,
      endTime: null,
      errorType: null,
    })
  })

  it('should initialize with null values', () => {
    const state = useFilterStore.getState()
    expect(state.agentId).toBeNull()
    expect(state.startTime).toBeNull()
    expect(state.endTime).toBeNull()
    expect(state.errorType).toBeNull()
  })

  it('should set agent filter', () => {
    const { setAgentId } = useFilterStore.getState()
    setAgentId('dev')

    const state = useFilterStore.getState()
    expect(state.agentId).toBe('dev')
  })

  it('should clear agent filter with null', () => {
    const { setAgentId } = useFilterStore.getState()
    setAgentId('qa')
    setAgentId(null)

    const state = useFilterStore.getState()
    expect(state.agentId).toBeNull()
  })

  it('should set time range', () => {
    const { setTimeRange } = useFilterStore.getState()
    const start = new Date('2026-03-14T00:00:00Z')
    const end = new Date('2026-03-14T23:59:59Z')

    setTimeRange(start, end)
    const state = useFilterStore.getState()

    expect(state.startTime).toEqual(start)
    expect(state.endTime).toEqual(end)
  })

  it('should set error type filter', () => {
    const { setErrorType } = useFilterStore.getState()
    setErrorType('validation_error')

    const state = useFilterStore.getState()
    expect(state.errorType).toBe('validation_error')
  })

  it('should reset all filters', () => {
    const { setAgentId, setTimeRange, setErrorType, reset } = useFilterStore.getState()

    setAgentId('dev')
    setTimeRange(new Date(), new Date())
    setErrorType('error')

    reset()
    const state = useFilterStore.getState()

    expect(state.agentId).toBeNull()
    expect(state.startTime).toBeNull()
    expect(state.endTime).toBeNull()
    expect(state.errorType).toBeNull()
  })
})
