/**
 * Timeline calculation service for aggregating and organizing execution events
 * into time-bucketed timeline data for visualization.
 */

export interface Execution {
  execution_id: string
  agent_id: string
  start_time: string // ISO timestamp
  end_time?: string // ISO timestamp (null if in-progress)
  duration_ms?: number // calculated from start_time → end_time
  status: 'running' | 'success' | 'error'
  event_count: number // events associated with execution
  error_message?: string // if status === 'error'
}

export interface TimelineBucket {
  bucket_time: string // Rounded to hour or 30-min interval
  executions: Execution[]
  bucket_id: string // For virtualization keys
}

export interface TimelineData {
  buckets: TimelineBucket[]
  agents: string[] // Sorted list of unique agent_ids
  earliest_time: string // Earliest event timestamp
  latest_time: string // Latest event timestamp
  total_executions: number
}

/**
 * Round timestamp to nearest bucket (hour or 30-min interval)
 */
function roundToBucket(timestamp: string, bucketSize: 'hour' | '30min'): string {
  const date = new Date(timestamp)
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const ms = date.getMilliseconds()

  if (bucketSize === 'hour') {
    date.setMinutes(0, 0, 0)
  } else {
    // 30-min interval: round to 0 or 30
    const roundedMin = minutes < 30 ? 0 : 30
    date.setMinutes(roundedMin, 0, 0)
  }

  return date.toISOString()
}

/**
 * Calculate duration between start and end times in milliseconds
 */
function calculateDuration(startTime: string, endTime?: string): number | undefined {
  if (!endTime) return undefined
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  return Math.max(0, end - start)
}

/**
 * Determine execution status from event data
 */
function determineStatus(
  status?: string,
  error_message?: string
): 'running' | 'success' | 'error' {
  if (error_message) return 'error'
  if (status === 'error') return 'error'
  if (status === 'success') return 'success'
  return 'running'
}

interface RawEvent {
  execution_id?: string
  id?: string
  agent_id?: string
  start_time?: string
  end_time?: string
  timestamp?: string
  status?: string
  error_message?: string
  event_count?: number
}

/**
 * Convert raw event to Execution record
 */
function eventToExecution(event: RawEvent): Execution {
  const start_time = event.start_time || event.timestamp || ''
  const end_time = event.end_time
  const duration_ms = calculateDuration(start_time, end_time)

  return {
    execution_id: event.execution_id || event.id || '',
    agent_id: event.agent_id || 'unknown',
    start_time,
    end_time,
    duration_ms,
    status: determineStatus(event.status, event.error_message),
    event_count: event.event_count || 1,
    error_message: event.error_message,
  }
}

/**
 * Calculate timeline data from events
 *
 * @param events - Raw event stream from eventStore
 * @param bucketSize - Time bucket size ('hour' or '30min')
 * @returns TimelineData with bucketed executions and metadata
 */
export function calculateTimeline(events: RawEvent[], bucketSize: 'hour' | '30min' = '30min'): TimelineData {
  if (!events || events.length === 0) {
    return {
      buckets: [],
      agents: [],
      earliest_time: new Date().toISOString(),
      latest_time: new Date().toISOString(),
      total_executions: 0,
    }
  }

  // Convert events to executions
  const executions = events
    .filter((e) => e.start_time || e.timestamp) // Only events with timestamps
    .map(eventToExecution)

  if (executions.length === 0) {
    return {
      buckets: [],
      agents: [],
      earliest_time: new Date().toISOString(),
      latest_time: new Date().toISOString(),
      total_executions: 0,
    }
  }

  // Find time range
  const startTimes = executions.map((e) => new Date(e.start_time).getTime())
  const endTimes = executions
    .filter((e) => e.end_time)
    .map((e) => new Date(e.end_time!).getTime())
  const allTimes = [...startTimes, ...endTimes]

  const earliest_time = new Date(Math.min(...allTimes)).toISOString()
  const latest_time = new Date(Math.max(...allTimes)).toISOString()

  // Group executions by time bucket
  const bucketMap = new Map<string, { bucketTime: string; executions: Execution[] }>()

  executions.forEach((execution) => {
    const bucketTime = roundToBucket(execution.start_time, bucketSize)
    const bucket_id = `${bucketTime}|${bucketSize}`

    if (!bucketMap.has(bucket_id)) {
      bucketMap.set(bucket_id, { bucketTime, executions: [] })
    }
    bucketMap.get(bucket_id)!.executions.push(execution)
  })

  // Create sorted buckets
  const buckets: TimelineBucket[] = Array.from(bucketMap.entries())
    .map(([bucket_id, { bucketTime, executions: execs }]) => ({
      bucket_time: bucketTime,
      executions: execs.sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
      bucket_id,
    }))
    .sort((a, b) => new Date(a.bucket_time).getTime() - new Date(b.bucket_time).getTime())

  // Collect unique agents (sorted)
  const agentSet = new Set(executions.map((e) => e.agent_id))
  const agents = Array.from(agentSet).sort()

  return {
    buckets,
    agents,
    earliest_time,
    latest_time,
    total_executions: executions.length,
  }
}
