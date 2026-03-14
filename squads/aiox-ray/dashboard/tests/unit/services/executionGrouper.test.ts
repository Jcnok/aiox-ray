import { describe, it, expect } from 'vitest'
import {
  groupExecutionsByAgent,
  calculateExecutionPosition,
  getStatusColor,
  type ExecutionPosition,
} from '../../../src/services/executionGrouper'
import type { Execution } from '../../../src/services/timelineCalculator'

describe('executionGrouper', () => {
  const now = new Date()
  const t1 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const t2 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
  const t3 = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const mockExecutions: Execution[] = [
    {
      execution_id: 'exec-1',
      agent_id: 'agent-a',
      start_time: t1,
      end_time: t2,
      duration_ms: 3600000,
      status: 'success',
      event_count: 5,
    },
    {
      execution_id: 'exec-2',
      agent_id: 'agent-b',
      start_time: t2,
      end_time: t3,
      duration_ms: 1800000,
      status: 'success',
      event_count: 3,
    },
    {
      execution_id: 'exec-3',
      agent_id: 'agent-a',
      start_time: t3,
      status: 'running',
      event_count: 2,
    },
  ]

  describe('groupExecutionsByAgent', () => {
    it('groups executions by agent_id', () => {
      const grouped = groupExecutionsByAgent(mockExecutions)
      expect(Object.keys(grouped)).toContain('agent-a')
      expect(Object.keys(grouped)).toContain('agent-b')
      expect(grouped['agent-a']).toHaveLength(2)
      expect(grouped['agent-b']).toHaveLength(1)
    })

    it('sorts executions within each agent by start_time', () => {
      const grouped = groupExecutionsByAgent(mockExecutions)
      const agentAExecs = grouped['agent-a']
      expect(agentAExecs[0].execution_id).toBe('exec-1')
      expect(agentAExecs[1].execution_id).toBe('exec-3')
      expect(new Date(agentAExecs[0].start_time).getTime()).toBeLessThan(
        new Date(agentAExecs[1].start_time).getTime()
      )
    })

    it('handles empty execution list', () => {
      const grouped = groupExecutionsByAgent([])
      expect(Object.keys(grouped)).toHaveLength(0)
    })

    it('handles executions with missing agent_id', () => {
      const execs: Execution[] = [
        {
          execution_id: 'exec-unknown',
          agent_id: '',
          start_time: t1,
          status: 'success',
          event_count: 1,
        },
      ]
      const grouped = groupExecutionsByAgent(execs)
      expect(grouped['unknown']).toHaveLength(1)
    })
  })

  describe('calculateExecutionPosition', () => {
    it('calculates correct offset and width for execution', () => {
      const execution: Execution = {
        execution_id: 'exec-1',
        agent_id: 'agent-a',
        start_time: t1,
        end_time: t2,
        duration_ms: 3600000,
        status: 'success',
        event_count: 1,
      }

      const timelineStart = t1
      const timelineEnd = t2
      const canvasWidth = 1000

      const position = calculateExecutionPosition(execution, timelineStart, timelineEnd, canvasWidth)

      expect(position.offsetPx).toBe(0) // Starts at timeline start
      expect(position.widthPx).toBe(1000) // Spans full width
    })

    it('handles execution in middle of timeline', () => {
      const mid = new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString()
      const execution: Execution = {
        execution_id: 'exec-mid',
        agent_id: 'agent-a',
        start_time: mid,
        end_time: mid,
        duration_ms: 100,
        status: 'success',
        event_count: 1,
      }

      const timelineStart = t1 // 2h ago
      const timelineEnd = now.toISOString() // now

      const position = calculateExecutionPosition(execution, timelineStart, timelineEnd, 1000)

      expect(position.offsetPx).toBeGreaterThan(0)
      expect(position.offsetPx).toBeLessThan(1000)
      expect(position.widthPx).toBeGreaterThan(0)
    })

    it('ensures minimum width for visibility', () => {
      const execution: Execution = {
        execution_id: 'exec-tiny',
        agent_id: 'agent-a',
        start_time: t1,
        end_time: t1, // No duration
        status: 'success',
        event_count: 1,
      }

      const timelineStart = t1
      const timelineEnd = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString()

      const position = calculateExecutionPosition(execution, timelineStart, timelineEnd, 10000)

      expect(position.widthPx).toBeGreaterThanOrEqual(2) // Minimum 2px
    })

    it('handles running executions without end_time', () => {
      const execution: Execution = {
        execution_id: 'exec-running',
        agent_id: 'agent-a',
        start_time: t2,
        status: 'running',
        event_count: 1,
      }

      const position = calculateExecutionPosition(execution, t1, now.toISOString(), 1000)

      expect(position.offsetPx).toBeGreaterThan(0)
      expect(position.widthPx).toBeGreaterThan(0)
    })
  })

  describe('getStatusColor', () => {
    it('returns green for success', () => {
      expect(getStatusColor('success')).toBe('bg-green-600')
    })

    it('returns red for error', () => {
      expect(getStatusColor('error')).toBe('bg-red-600')
    })

    it('returns gray for running', () => {
      expect(getStatusColor('running')).toBe('bg-gray-600')
    })
  })
})
