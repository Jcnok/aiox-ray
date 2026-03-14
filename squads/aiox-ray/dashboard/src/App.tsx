import { useEffect } from 'react'
import Layout from './components/Layout'
import { useEventStream } from './hooks/useEventStream'

export default function App() {
  // Connect to SSE stream on mount
  useEventStream()

  return <Layout />
}
