import React, { useState } from 'react'
import { useEventStore } from '../stores/eventStore'
import { buildExecutionDetail } from '../services/executionDetailBuilder'
import { CollapsibleSection } from './CollapsibleSection'
import { ExecutionMetadata } from './ExecutionMetadata'
import { CotTimeline } from './CotTimeline'
import { ErrorDisplay } from './ErrorDisplay'
import { JsonViewer } from './JsonViewer'

interface DrilldownPaneProps {
  executionId: string
  onClose: () => void
}

/**
 * Drill-down detail pane for execution inspection
 * Slides in from the right side, shows all execution data in collapsible sections
 */
export function DrilldownPane({ executionId, onClose }: DrilldownPaneProps) {
  const getEventsByExecutionId = useEventStore((s) => s.getEventsByExecutionId)
  const events = getEventsByExecutionId(executionId)
  const detail = buildExecutionDetail(events)
  const [copiedJson, setCopiedJson] = useState(false)

  const copyFullJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail.raw_events, null, 2))
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex"
      data-testid="drilldown-pane"
    >
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/40 md:hidden"
        onClick={onClose}
        data-testid="drilldown-backdrop"
      />

      {/* Panel */}
      <div
        className="relative ml-auto w-full max-w-[600px] min-w-[320px] md:min-w-[400px] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-slide-in"
        data-testid="drilldown-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm truncate">
            Execution Detail
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            aria-label="Close detail pane"
            data-testid="drilldown-close"
          >
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {events.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8" data-testid="drilldown-empty">
              No events found for execution {executionId}
            </div>
          ) : (
            <>
              {/* Metadata — expanded by default */}
              <CollapsibleSection title="Metadata" defaultOpen>
                <ExecutionMetadata detail={detail} />
              </CollapsibleSection>

              {/* Input/Output JSON */}
              {(detail.input || detail.output) && (
                <CollapsibleSection title="Input / Output">
                  {detail.input && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1 font-medium">Input</div>
                      <JsonViewer data={detail.input} maxHeight={200} />
                    </div>
                  )}
                  {detail.output && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1 font-medium">Output</div>
                      <JsonViewer data={detail.output} maxHeight={200} />
                    </div>
                  )}
                </CollapsibleSection>
              )}

              {/* Chain of Thought */}
              <CollapsibleSection title="Chain of Thought">
                <CotTimeline milestones={detail.cot_milestones || []} />
              </CollapsibleSection>

              {/* Errors — expanded if errors exist */}
              <CollapsibleSection title="Errors" defaultOpen={!!detail.error}>
                <ErrorDisplay error={detail.error} />
              </CollapsibleSection>

              {/* ADE Steps */}
              {detail.ade_steps && detail.ade_steps.length > 0 && (
                <CollapsibleSection title="ADE Steps">
                  <div className="space-y-2">
                    {detail.ade_steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" data-testid={`ade-step-${i}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          step.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-gray-200 flex-1">{step.step_name}</span>
                        {step.duration_ms !== undefined && (
                          <span className="text-gray-500 text-xs">{step.duration_ms}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Raw JSON */}
              <CollapsibleSection title="Raw JSON">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={copyFullJson}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    data-testid="copy-full-json"
                  >
                    {copiedJson ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <JsonViewer data={detail.raw_events} maxHeight={300} />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
