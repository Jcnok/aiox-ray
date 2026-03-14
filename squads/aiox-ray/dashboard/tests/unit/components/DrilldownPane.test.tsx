import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrilldownPane } from '../../../src/components/DrilldownPane'

// Mock eventStore
const mockGetEventsByExecutionId = vi.fn()
vi.mock('../../../src/stores/eventStore', () => ({
  useEventStore: (selector: any) => selector({
    getEventsByExecutionId: mockGetEventsByExecutionId,
  }),
}))

const mockEvents = [
  {
    event_id: 'evt-1',
    event_type: 'agent.started',
    agent_id: 'orchestrator',
    execution_id: 'exec-1',
    timestamp: '2026-03-14T10:00:00Z',
    payload: { input: { prompt: 'hello' } },
  },
  {
    event_id: 'evt-2',
    event_type: 'agent.finished',
    agent_id: 'orchestrator',
    execution_id: 'exec-1',
    timestamp: '2026-03-14T10:00:05Z',
    duration_ms: 5000,
    payload: { status: 'success', output: { result: 'done' } },
  },
]

describe('DrilldownPane', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEventsByExecutionId.mockReturnValue(mockEvents)
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders pane with testid', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByTestId('drilldown-pane')).toBeTruthy()
  })

  it('displays execution detail header', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Execution Detail')).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('drilldown-close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop clicked', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('drilldown-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows empty state when no events', () => {
    mockGetEventsByExecutionId.mockReturnValue([])
    render(<DrilldownPane executionId="exec-missing" onClose={onClose} />)
    expect(screen.getByTestId('drilldown-empty')).toBeTruthy()
  })

  it('renders Metadata section expanded by default', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Metadata')).toBeTruthy()
    expect(screen.getByTestId('execution-metadata')).toBeTruthy()
  })

  it('renders Chain of Thought section', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Chain of Thought')).toBeTruthy()
  })

  it('renders Errors section', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Errors')).toBeTruthy()
  })

  it('renders Raw JSON section', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Raw JSON')).toBeTruthy()
  })

  it('renders Input/Output section when data exists', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('Input / Output')).toBeTruthy()
  })

  it('fetches events by execution ID', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(mockGetEventsByExecutionId).toHaveBeenCalledWith('exec-1')
  })

  it('renders ADE steps when available', () => {
    mockGetEventsByExecutionId.mockReturnValue([
      {
        event_id: 'evt-1',
        event_type: 'agent.finished',
        agent_id: 'agent-1',
        execution_id: 'exec-1',
        timestamp: '2026-03-14T10:00:00Z',
        payload: {
          status: 'success',
          ade_steps: [
            { step_name: 'Analyze', status: 'completed', duration_ms: 100 },
          ],
        },
      },
    ])
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.getByText('ADE Steps')).toBeTruthy()
  })

  it('does not render ADE section when no steps', () => {
    render(<DrilldownPane executionId="exec-1" onClose={onClose} />)
    expect(screen.queryByText('ADE Steps')).toBeNull()
  })
})
