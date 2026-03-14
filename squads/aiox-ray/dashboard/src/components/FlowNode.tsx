import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { FlowNodeData } from '../services/graphBuilder'
import { getNodeColor } from '../services/graphBuilder'

interface FlowNodeComponentProps {
  data: FlowNodeData
  selected?: boolean
}

/**
 * Custom node component for the flow graph
 * Displays agent/skill with color-coded status and size proportional to duration
 */
function FlowNodeComponent({ data, selected }: FlowNodeComponentProps) {
  const colorClass = getNodeColor(data.status)
  const isSkill = data.node_type === 'skill'

  // Size based on total_duration_ms (min 60px, max 120px)
  const size = Math.max(60, Math.min(120, 60 + (data.total_duration_ms / 1000) * 5))

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />
      <div
        data-testid={`flow-node-${data.agent_id}`}
        className={`
          flex flex-col items-center justify-center rounded-lg p-2 text-white font-mono text-xs
          ${colorClass}
          ${isSkill ? 'border-2 border-blue-400' : ''}
          ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
        `}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <div className="text-lg">{isSkill ? '⚡' : '🤖'}</div>
        <div className="truncate max-w-full mt-1">{data.agent_id}</div>
        <div className="text-[10px] opacity-75">{data.total_calls} calls</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </>
  )
}

export const FlowNode = memo(FlowNodeComponent)
