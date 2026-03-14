import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollapsibleSection } from '../../../src/components/CollapsibleSection'

describe('CollapsibleSection', () => {
  it('renders title', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Content</p>
      </CollapsibleSection>
    )
    expect(screen.getByText('Test Section')).toBeTruthy()
  })

  it('is collapsed by default', () => {
    render(
      <CollapsibleSection title="Test">
        <p>Hidden content</p>
      </CollapsibleSection>
    )
    expect(screen.queryByTestId('collapsible-content')).toBeNull()
  })

  it('is expanded when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Test" defaultOpen>
        <p>Visible content</p>
      </CollapsibleSection>
    )
    expect(screen.getByTestId('collapsible-content')).toBeTruthy()
    expect(screen.getByText('Visible content')).toBeTruthy()
  })

  it('toggles on click', () => {
    render(
      <CollapsibleSection title="Test">
        <p>Content</p>
      </CollapsibleSection>
    )
    const trigger = screen.getByTestId('collapsible-trigger')

    // Open
    fireEvent.click(trigger)
    expect(screen.getByTestId('collapsible-content')).toBeTruthy()

    // Close
    fireEvent.click(trigger)
    expect(screen.queryByTestId('collapsible-content')).toBeNull()
  })

  it('toggles on Enter key', () => {
    render(
      <CollapsibleSection title="Test">
        <p>Content</p>
      </CollapsibleSection>
    )
    const trigger = screen.getByTestId('collapsible-trigger')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(screen.getByTestId('collapsible-content')).toBeTruthy()
  })

  it('toggles on Space key', () => {
    render(
      <CollapsibleSection title="Test">
        <p>Content</p>
      </CollapsibleSection>
    )
    const trigger = screen.getByTestId('collapsible-trigger')
    fireEvent.keyDown(trigger, { key: ' ' })
    expect(screen.getByTestId('collapsible-content')).toBeTruthy()
  })

  it('has aria-expanded attribute', () => {
    render(
      <CollapsibleSection title="Test">
        <p>Content</p>
      </CollapsibleSection>
    )
    const trigger = screen.getByTestId('collapsible-trigger')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('rotates chevron when open', () => {
    render(
      <CollapsibleSection title="Test" defaultOpen>
        <p>Content</p>
      </CollapsibleSection>
    )
    const chevron = screen.getByTestId('collapsible-chevron')
    expect(chevron.className).toContain('rotate-180')
  })
})
