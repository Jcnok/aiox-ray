import { create } from 'zustand'

export interface Event {
  event_id: string
  event_type: string
  agent_id: string
  execution_id: string
  timestamp: string
  duration_ms?: number
  payload?: Record<string, any>
}

interface EventStore {
  events: Event[]
  addEvent: (event: Event) => void
  setEvents: (events: Event[]) => void
  clearEvents: () => void
  getEventsByExecutionId: (executionId: string) => Event[]
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],

  addEvent: (event: Event) =>
    set((state) => ({
      events: [...state.events, event]
    })),

  setEvents: (events: Event[]) =>
    set({ events }),

  clearEvents: () =>
    set({ events: [] }),

  getEventsByExecutionId: (executionId: string) => {
    const state = get()
    return state.events.filter((e) => e.execution_id === executionId)
  }
}))
