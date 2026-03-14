import React from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
} from '@xyflow/react'
import type { FlowEdgeData } from '../services/graphBuilder'

interface FlowEdgeComponentProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  data?: FlowEdgeData
  selected?: boolean
}

/**
 * Custom edge component for the flow graph
 * Shows directed arrow with invocation count label
 * Width proportional to invocation_count
 */
export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: FlowEdgeComponentProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const strokeWidth = Math.max(1, Math.min(6, (data?.invocation_count || 1)))

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#ffffff' : '#6b7280',
          strokeWidth,
        }}
        markerEnd="url(#arrowhead)"
      />
      {data && data.invocation_count > 0 && (
        <EdgeLabelRenderer>
          <div
            data-testid={`edge-label-${id}`}
            className="absolute bg-gray-800 text-gray-300 text-[10px] px-1 rounded pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data.invocation_count}x
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
