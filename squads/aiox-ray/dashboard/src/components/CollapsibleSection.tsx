import React, { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

/**
 * Reusable collapsible section with chevron indicator
 * Keyboard accessible (Enter/Space to toggle)
 */
export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = () => setIsOpen((prev) => !prev)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden" data-testid="collapsible-section">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 text-white text-sm font-medium cursor-pointer select-none transition-colors"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        data-testid="collapsible-trigger"
      >
        <span>{title}</span>
        <span
          className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          data-testid="collapsible-chevron"
        >
          &#9660;
        </span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-gray-900" data-testid="collapsible-content">
          {children}
        </div>
      )}
    </div>
  )
}
