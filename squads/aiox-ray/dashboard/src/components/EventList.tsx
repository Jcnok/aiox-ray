import { useEventStore, Event } from '../stores/eventStore'

export default function EventList() {
  const events = useEventStore((state) => state.events)

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Waiting for events...</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event: Event) => (
        <div
          key={event.event_id}
          className="p-3 bg-secondary border border-gray-700 rounded text-sm font-mono hover:bg-primary/50 transition-colors"
        >
          <div className="text-gray-300">
            <span className="text-accent font-semibold">{event.execution_id}</span>
            {' | '}
            <span className="text-yellow-400">{event.agent_id}</span>
            {' | '}
            <span className="text-gray-400">{event.event_type}</span>
            {' | '}
            <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
            {event.duration_ms && (
              <>
                {' | '}
                <span className="text-blue-400">{event.duration_ms}ms</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
