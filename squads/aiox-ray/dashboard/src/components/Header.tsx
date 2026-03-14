export default function Header() {
  return (
    <header className="bg-primary border-b border-secondary px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          🌊 AIOX-Ray Dashboard
        </h1>
        <nav className="flex gap-6">
          <a href="/" className="text-sm text-gray-300 hover:text-white">
            Overview
          </a>
          <a href="/historical" className="text-sm text-gray-300 hover:text-white">
            Historical
          </a>
          <a href="/reports" className="text-sm text-gray-300 hover:text-white">
            Reports
          </a>
        </nav>
      </div>
    </header>
  )
}
