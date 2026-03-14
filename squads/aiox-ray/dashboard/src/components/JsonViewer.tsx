import React from 'react'

interface JsonViewerProps {
  data: Record<string, any> | any[] | string | number | boolean | null
  maxHeight?: number
}

/**
 * Recursive JSON viewer with syntax highlighting using Tailwind colors
 */
export function JsonViewer({ data, maxHeight = 400 }: JsonViewerProps) {
  return (
    <div
      className="overflow-auto font-mono text-xs leading-relaxed"
      style={{ maxHeight: `${maxHeight}px` }}
      data-testid="json-viewer"
    >
      <pre className="whitespace-pre-wrap break-all">
        <JsonValue value={data} indent={0} />
      </pre>
    </div>
  )
}

function JsonValue({ value, indent }: { value: any; indent: number }) {
  if (value === null) return <span className="text-gray-500">null</span>
  if (value === undefined) return <span className="text-gray-500">undefined</span>

  if (typeof value === 'string') {
    return <span className="text-green-400">&quot;{value}&quot;</span>
  }

  if (typeof value === 'number') {
    return <span className="text-blue-400">{value}</span>
  }

  if (typeof value === 'boolean') {
    return <span className="text-yellow-400">{value ? 'true' : 'false'}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[]</span>
    const pad = '  '.repeat(indent + 1)
    const closePad = '  '.repeat(indent)
    return (
      <>
        <span className="text-gray-400">[</span>
        {'\n'}
        {value.map((item, i) => (
          <React.Fragment key={i}>
            {pad}
            <JsonValue value={item} indent={indent + 1} />
            {i < value.length - 1 ? ',' : ''}
            {'\n'}
          </React.Fragment>
        ))}
        {closePad}
        <span className="text-gray-400">]</span>
      </>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return <span className="text-gray-400">{'{}'}</span>
    const pad = '  '.repeat(indent + 1)
    const closePad = '  '.repeat(indent)
    return (
      <>
        <span className="text-gray-400">{'{'}</span>
        {'\n'}
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            {pad}
            <span className="text-purple-400">&quot;{key}&quot;</span>
            <span className="text-gray-400">: </span>
            <JsonValue value={value[key]} indent={indent + 1} />
            {i < keys.length - 1 ? ',' : ''}
            {'\n'}
          </React.Fragment>
        ))}
        {closePad}
        <span className="text-gray-400">{'}'}</span>
      </>
    )
  }

  return <span className="text-gray-300">{String(value)}</span>
}
