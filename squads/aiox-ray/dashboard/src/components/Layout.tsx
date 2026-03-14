import Header from './Header'
import Sidebar from './Sidebar'
import EventList from './EventList'

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="bg-secondary rounded-lg p-6 border border-gray-700 h-full">
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
