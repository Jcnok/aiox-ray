import React, { useMemo } from 'react'

interface TimeAxisProps {
  earliestTime: string
  latestTime: string
}

/**
 * Time axis display showing hourly time markers
 * Fixed left sidebar for timeline reference
 */
export function TimeAxis({ earliestTime, latestTime }: TimeAxisProps) {
  const timeLabels = useMemo(() => {
    const labels: { time: string; label: string }[] = []

    const start = new Date(earliestTime).getTime()
    const end = new Date(latestTime).getTime()
    const range = end - start

    // Generate time labels at 30-minute intervals
    let current = start
    const step = 30 * 60 * 1000 // 30 minutes

    while (current <= end) {
      const date = new Date(current)
      const hours = String(date.getHours()).padStart(2, '0')
      const mins = String(date.getMinutes()).padStart(2, '0')

      labels.push({
        time: date.toISOString(),
        label: `${hours}:${mins}`,
      })

      current += step
    }

    // If no labels generated, show start and end
    if (labels.length === 0) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      labels.push({
        time: startDate.toISOString(),
        label: startDate.toLocaleTimeString(),
      })
      labels.push({
        time: endDate.toISOString(),
        label: endDate.toLocaleTimeString(),
      })
    }

    return labels
  }, [earliestTime, latestTime])

  return (
    <div className="w-24 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="flex-1 flex flex-col justify-between px-2 py-4 text-xs text-gray-400">
        {timeLabels.map((label, idx) => (
          <div key={idx} className="font-mono text-gray-500">
            {label.label}
          </div>
        ))}
      </div>
    </div>
  )
}
