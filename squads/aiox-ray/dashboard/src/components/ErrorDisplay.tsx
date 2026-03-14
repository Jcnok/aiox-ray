import React, { useState } from 'react'
import type { ErrorInfo } from '../services/executionDetailBuilder'

interface ErrorDisplayProps {
  error?: ErrorInfo
}

/**
 * Displays error information with red styling and copy trace button
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false)

  if (!error) {
    return (
      <div className="text-gray-500 text-sm italic" data-testid="error-empty">
        No errors
      </div>
    )
  }

  const copyTrace = async () => {
    const text = error.stack || error.message
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
    }
  }

  return (
    <div
      className="border border-red-700 rounded-lg bg-red-950/30 p-3 space-y-2"
      data-testid="error-display"
    >
      {/* Error message */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-red-400 text-sm font-medium flex-1">{error.message}</div>
        <button
          onClick={copyTrace}
          className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded flex-shrink-0 transition-colors"
          data-testid="copy-error-trace"
        >
          {copied ? 'Copied!' : 'Copy trace'}
        </button>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-red-500/70">{error.timestamp}</div>

      {/* Stack trace */}
      {error.stack && (
        <pre
          className="text-xs text-red-300/80 font-mono whitespace-pre-wrap overflow-auto max-h-48 bg-red-950/50 rounded p-2"
          data-testid="error-stack"
        >
          {error.stack}
        </pre>
      )}
    </div>
  )
}
