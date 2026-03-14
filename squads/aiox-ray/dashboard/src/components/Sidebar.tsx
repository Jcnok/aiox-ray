import { useFilterStore } from '../stores/filterStore'

export default function Sidebar() {
  const { agentId, setAgentId } = useFilterStore()

  return (
    <aside className="hidden md:block w-64 bg-secondary border-r border-gray-700 p-4">
      <div className="space-y-6">
        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            Filter by Agent
          </label>
          <select
            value={agentId || ''}
            onChange={(e) => setAgentId(e.target.value || null)}
            className="w-full px-3 py-2 bg-primary border border-gray-600 text-white rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value="">All Agents</option>
            <option value="dev">@dev</option>
            <option value="qa">@qa</option>
            <option value="architect">@architect</option>
          </select>
        </div>

        {/* Time Picker (non-functional UI) */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            Time Range
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 bg-primary border border-gray-600 text-white rounded text-sm focus:outline-none focus:border-accent"
            placeholder="Start date"
          />
          <input
            type="date"
            className="w-full px-3 py-2 bg-primary border border-gray-600 text-white rounded text-sm mt-2 focus:outline-none focus:border-accent"
            placeholder="End date"
          />
        </div>

        {/* Filter Button */}
        <button className="w-full px-4 py-2 bg-accent text-white rounded font-medium hover:bg-blue-600 transition-colors">
          Apply Filters
        </button>
      </div>
    </aside>
  )
}
