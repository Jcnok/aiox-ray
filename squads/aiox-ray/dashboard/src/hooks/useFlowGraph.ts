import { useEffect, useMemo, useState } from 'react'
import { useEventStore } from '../stores/eventStore'
import { buildGraphData, type GraphData } from '../services/graphBuilder'

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [], agents: [] }

/**
 * Hook to build and update flow graph data from eventStore
 * Recalculates graph every updateInterval ms (default 3s)
 */
export function useFlowGraph(updateInterval: number = 3000) {
  const events = useEventStore((state) => state.events)
  const [graphData, setGraphData] = useState<GraphData>(EMPTY_GRAPH)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const buildAndUpdate = () => {
      try {
        setIsLoading(true)
        const data = buildGraphData(events)
        setGraphData(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error building graph data:', error)
        setIsLoading(false)
      }
    }

    buildAndUpdate()

    const interval = setInterval(buildAndUpdate, updateInterval)

    return () => clearInterval(interval)
  }, [events, updateInterval])

  return {
    graphData,
    isLoading,
  }
}
