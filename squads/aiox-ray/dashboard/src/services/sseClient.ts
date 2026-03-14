import { Event } from '../stores/eventStore'

export class SSEClient {
  private eventSource: EventSource | null = null
  private url: string
  private retryCount = 0
  private maxRetries = 10
  private baseDelay = 1000

  constructor(url: string) {
    this.url = url
  }

  connect(onMessage: (event: Event) => void, onError?: (error: Error) => void): void {
    try {
      this.eventSource = new EventSource(this.url)

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
          this.retryCount = 0 // Reset on successful message
        } catch (error) {
          console.error('Failed to parse SSE event:', error)
        }
      }

      this.eventSource.onerror = () => {
        this.handleError(onMessage, onError)
      }

      console.log('[SSE] Connected to', this.url)
    } catch (error) {
      this.handleError(onMessage, onError)
    }
  }

  private handleError(onMessage: (event: Event) => void, onError?: (error: Error) => void): void {
    this.close()

    if (this.retryCount < this.maxRetries) {
      const delay = this.baseDelay * Math.pow(2, this.retryCount)
      const jitter = Math.random() * 1000
      const totalDelay = Math.min(delay + jitter, 30000)

      console.log(`[SSE] Reconnecting in ${totalDelay.toFixed(0)}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`)

      setTimeout(() => {
        this.retryCount++
        this.connect(onMessage, onError)
      }, totalDelay)
    } else {
      const error = new Error('SSE connection failed after max retries')
      console.error('[SSE]', error.message)
      onError?.(error)
    }
  }

  close(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      console.log('[SSE] Disconnected')
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}
