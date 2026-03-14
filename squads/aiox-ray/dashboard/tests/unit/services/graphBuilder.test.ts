import { describe, it, expect } from 'vitest'
import { buildGraphData, getNodeColor } from '../../../src/services/graphBuilder'

describe('graphBuilder', () => {
  describe('buildGraphData', () => {
    it('should return empty graph for empty events', () => {
      const result = buildGraphData([])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
      expect(result.agents).toHaveLength(0)
    })

    it('should return empty graph for null/undefined input', () => {
      const result = buildGraphData(null as any)
      expect(result.nodes).toHaveLength(0)
    })

    it('should create nodes for unique agents', () => {
      const events = [
        { agent_id: 'dev', event_type: 'agent.started', execution_id: 'e1', duration_ms: 100 },
        { agent_id: 'qa', event_type: 'agent.started', execution_id: 'e2', duration_ms: 200 },
        { agent_id: 'dev', event_type: 'agent.finished', execution_id: 'e1', duration_ms: 150 },
      ]
      const result = buildGraphData(events)
      expect(result.nodes).toHaveLength(2)
      expect(result.agents).toEqual(['dev', 'qa'])
    })

    it('should calculate correct stats for agent nodes', () => {
      const events = [
        { agent_id: 'dev', event_type: 'agent.started', execution_id: 'e1', duration_ms: 100 },
        { agent_id: 'dev', event_type: 'agent.finished', execution_id: 'e1', duration_ms: 200 },
      ]
      const result = buildGraphData(events)
      const devNode = result.nodes.find((n) => n.id === 'dev')
      expect(devNode).toBeDefined()
      expect(devNode!.data.total_calls).toBe(2)
      expect(devNode!.data.avg_duration_ms).toBe(150)
      expect(devNode!.data.total_duration_ms).toBe(300)
      expect(devNode!.data.error_count).toBe(0)
      expect(devNode!.data.status).toBe('success')
    })

    it('should detect error status correctly', () => {
      const events = [
        {
          agent_id: 'qa',
          event_type: 'error.occurred',
          execution_id: 'e1',
          duration_ms: 50,
        },
      ]
      const result = buildGraphData(events)
      const qaNode = result.nodes.find((n) => n.id === 'qa')
      expect(qaNode!.data.status).toBe('error')
      expect(qaNode!.data.error_count).toBe(1)
      expect(qaNode!.data.error_rate).toBe(1)
    })

    it('should detect mixed status', () => {
      const events = [
        { agent_id: 'dev', event_type: 'agent.finished', execution_id: 'e1', duration_ms: 100 },
        {
          agent_id: 'dev',
          event_type: 'error.occurred',
          execution_id: 'e2',
          duration_ms: 50,
        },
      ]
      const result = buildGraphData(events)
      const devNode = result.nodes.find((n) => n.id === 'dev')
      expect(devNode!.data.status).toBe('mixed')
      expect(devNode!.data.error_rate).toBe(0.5)
    })

    it('should identify skill nodes', () => {
      const events = [
        { agent_id: 'commit-skill', event_type: 'skill.executed', execution_id: 'e1', duration_ms: 30 },
      ]
      const result = buildGraphData(events)
      expect(result.nodes[0].data.node_type).toBe('skill')
    })

    it('should build edges from parent_execution_id', () => {
      const events = [
        { agent_id: 'orchestrator', event_type: 'agent.started', execution_id: 'e1', duration_ms: 500 },
        {
          agent_id: 'dev',
          event_type: 'agent.started',
          execution_id: 'e2',
          duration_ms: 200,
          payload: { parent_execution_id: 'e1' },
        },
      ]
      const result = buildGraphData(events)
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].source).toBe('orchestrator')
      expect(result.edges[0].target).toBe('dev')
      expect(result.edges[0].data!.invocation_count).toBe(1)
    })

    it('should aggregate edge invocation counts', () => {
      const events = [
        { agent_id: 'orchestrator', event_type: 'agent.started', execution_id: 'e1' },
        {
          agent_id: 'dev',
          event_type: 'agent.started',
          execution_id: 'e2',
          duration_ms: 100,
          payload: { parent_execution_id: 'e1' },
        },
        {
          agent_id: 'dev',
          event_type: 'agent.started',
          execution_id: 'e3',
          duration_ms: 200,
          payload: { parent_execution_id: 'e1' },
        },
      ]
      const result = buildGraphData(events)
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].data!.invocation_count).toBe(2)
      expect(result.edges[0].data!.avg_duration_ms).toBe(150)
    })

    it('should skip events without agent_id', () => {
      const events = [
        { event_type: 'agent.started', execution_id: 'e1' },
        { agent_id: 'dev', event_type: 'agent.started', execution_id: 'e2' },
      ]
      const result = buildGraphData(events)
      expect(result.nodes).toHaveLength(1)
      expect(result.agents).toEqual(['dev'])
    })

    it('should not create self-referencing edges', () => {
      const events = [
        { agent_id: 'dev', event_type: 'agent.started', execution_id: 'e1' },
        {
          agent_id: 'dev',
          event_type: 'agent.finished',
          execution_id: 'e2',
          payload: { parent_execution_id: 'e1' },
        },
      ]
      const result = buildGraphData(events)
      expect(result.edges).toHaveLength(0)
    })

    it('should assign positions to nodes', () => {
      const events = [
        { agent_id: 'dev', event_type: 'agent.started', execution_id: 'e1' },
        { agent_id: 'qa', event_type: 'agent.started', execution_id: 'e2' },
      ]
      const result = buildGraphData(events)
      expect(result.nodes[0].position).toBeDefined()
      expect(result.nodes[0].position.x).toBeGreaterThan(0)
      expect(result.nodes[0].position.y).toBeGreaterThan(0)
    })

    it('should handle events with payload status error', () => {
      const events = [
        {
          agent_id: 'dev',
          event_type: 'agent.finished',
          execution_id: 'e1',
          payload: { status: 'error' },
        },
      ]
      const result = buildGraphData(events)
      expect(result.nodes[0].data.error_count).toBe(1)
      expect(result.nodes[0].data.status).toBe('error')
    })
  })

  describe('getNodeColor', () => {
    it('should return green for success', () => {
      expect(getNodeColor('success')).toBe('bg-green-500')
    })

    it('should return red for error', () => {
      expect(getNodeColor('error')).toBe('bg-red-500')
    })

    it('should return gray for mixed', () => {
      expect(getNodeColor('mixed')).toBe('bg-gray-500')
    })
  })
})
