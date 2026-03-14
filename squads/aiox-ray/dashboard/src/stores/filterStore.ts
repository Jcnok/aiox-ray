import { create } from 'zustand'

interface FilterStore {
  agentId: string | null
  startTime: Date | null
  endTime: Date | null
  errorType: string | null
  setAgentId: (id: string | null) => void
  setTimeRange: (start: Date, end: Date) => void
  setErrorType: (type: string | null) => void
  reset: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  agentId: null,
  startTime: null,
  endTime: null,
  errorType: null,

  setAgentId: (id: string | null) => set({ agentId: id }),

  setTimeRange: (start: Date, end: Date) =>
    set({ startTime: start, endTime: end }),

  setErrorType: (type: string | null) => set({ errorType: type }),

  reset: () =>
    set({
      agentId: null,
      startTime: null,
      endTime: null,
      errorType: null
    })
}))
