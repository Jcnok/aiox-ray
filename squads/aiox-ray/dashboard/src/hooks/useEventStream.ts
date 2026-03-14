import { useEffect } from 'react'
import { useEventStore } from '../stores/eventStore'
import { useUIStore } from '../stores/uiStore'
import { SSEClient } from '../services/sseClient'

export function useEventStream(url: string = '/events/stream'): void {
  const addEvent = useEventStore((state) => state.addEvent)
  const setError = useUIStore((state) => state.setError)

  useEffect(() => {
    const sseClient = new SSEClient(url)

    sseClient.connect(
      (event) => {
        addEvent(event)
        setError(null)
      },
      (error) => {
        setError(error.message)
      }
    )

    return () => {
      sseClient.close()
    }
  }, [url, addEvent, setError])
}
