import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedExecutionId: null,
      isLoading: false,
      error: null,
    })
  })

  it('should initialize with default values', () => {
    const state = useUIStore.getState()
    expect(state.selectedExecutionId).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set selected execution', () => {
    const { setSelectedExecution } = useUIStore.getState()
    setSelectedExecution('exec-123')

    const state = useUIStore.getState()
    expect(state.selectedExecutionId).toBe('exec-123')
  })

  it('should clear selected execution with null', () => {
    const { setSelectedExecution } = useUIStore.getState()
    setSelectedExecution('exec-123')
    setSelectedExecution(null)

    const state = useUIStore.getState()
    expect(state.selectedExecutionId).toBeNull()
  })

  it('should set loading state', () => {
    const { setLoading } = useUIStore.getState()
    setLoading(true)

    let state = useUIStore.getState()
    expect(state.isLoading).toBe(true)

    setLoading(false)
    state = useUIStore.getState()
    expect(state.isLoading).toBe(false)
  })

  it('should set error message', () => {
    const { setError } = useUIStore.getState()
    setError('Connection failed')

    const state = useUIStore.getState()
    expect(state.error).toBe('Connection failed')
  })

  it('should clear error with null', () => {
    const { setError } = useUIStore.getState()
    setError('Connection failed')
    setError(null)

    const state = useUIStore.getState()
    expect(state.error).toBeNull()
  })
})
