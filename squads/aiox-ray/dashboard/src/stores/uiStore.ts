import { create } from 'zustand'

interface UIStore {
  selectedExecutionId: string | null
  isLoading: boolean
  error: string | null
  setSelectedExecution: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedExecutionId: null,
  isLoading: false,
  error: null,

  setSelectedExecution: (id: string | null) =>
    set({ selectedExecutionId: id }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error })
}))
