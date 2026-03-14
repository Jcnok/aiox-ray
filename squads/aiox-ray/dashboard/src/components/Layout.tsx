import Header from './Header'
import Sidebar from './Sidebar'
import EventList from './EventList'
import MetricsCards from './MetricsCards'
import { TimelineView } from './TimelineView'
import { FlowGraph } from './FlowGraph'
import { useMetrics } from '../hooks/useMetrics'
import { useTimeline } from '../hooks/useTimeline'
import { useFlowGraph } from '../hooks/useFlowGraph'
import { useUIStore } from '../stores/uiStore'

export default function Layout() {
  const { metrics, trends } = useMetrics()
  const { timelineData, isLoading: timelineLoading } = useTimeline()
  const { graphData, isLoading: graphLoading } = useFlowGraph()
  const setSelectedExecution = useUIStore((s) => s.setSelectedExecution)

  return (
    <div className="h-screen flex flex-col bg-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {/* Metrics Cards */}
          <MetricsCards metrics={metrics} trends={trends} />

          {/* Timeline View */}
          <div className="my-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Execution Timeline
            </h2>
            <TimelineView timelineData={timelineData} isLoading={timelineLoading} />
          </div>

          {/* Flow Graph */}
          <div className="my-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Agent Flow Graph
            </h2>
            <FlowGraph
              graphData={graphData}
              onSelectNode={setSelectedExecution}
              isLoading={graphLoading}
            />
          </div>

          {/* Events List */}
          <div className="bg-secondary rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Real-Time Events
            </h2>
            <EventList />
          </div>
        </main>
      </div>
    </div>
  )
}
