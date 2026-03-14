import React from 'react'

/**
 * Legend component for the flow graph
 * Shows node type icons and color meanings
 */
export function FlowLegend() {
  return (
    <div
      data-testid="flow-legend"
      className="absolute bottom-3 left-3 bg-gray-800/90 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 z-10"
    >
      <div className="font-semibold text-white mb-2">Legend</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span>🤖</span>
          <span>Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <span>⚡</span>
          <span>Skill</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Error</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span>Mixed</span>
        </div>
      </div>
    </div>
  )
}
