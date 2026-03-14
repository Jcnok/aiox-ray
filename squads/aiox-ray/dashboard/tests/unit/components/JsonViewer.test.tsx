import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JsonViewer } from '../../../src/components/JsonViewer'

describe('JsonViewer', () => {
  it('renders null value', () => {
    render(<JsonViewer data={null} />)
    expect(screen.getByText('null')).toBeTruthy()
  })

  it('renders string value', () => {
    render(<JsonViewer data={{ name: 'test' }} />)
    expect(screen.getByText('"name"')).toBeTruthy()
    expect(screen.getByText('"test"')).toBeTruthy()
  })

  it('renders number value', () => {
    render(<JsonViewer data={{ count: 42 }} />)
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('renders boolean value', () => {
    render(<JsonViewer data={{ active: true }} />)
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('renders nested objects', () => {
    render(<JsonViewer data={{ outer: { inner: 'value' } }} />)
    expect(screen.getByText('"outer"')).toBeTruthy()
    expect(screen.getByText('"inner"')).toBeTruthy()
    expect(screen.getByText('"value"')).toBeTruthy()
  })

  it('renders arrays', () => {
    render(<JsonViewer data={{ items: [1, 2, 3] }} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders empty object', () => {
    render(<JsonViewer data={{}} />)
    expect(screen.getByText('{}')).toBeTruthy()
  })

  it('renders empty array', () => {
    render(<JsonViewer data={{ list: [] }} />)
    expect(screen.getByText('[]')).toBeTruthy()
  })

  it('applies maxHeight style', () => {
    render(<JsonViewer data={{ a: 1 }} maxHeight={200} />)
    const viewer = screen.getByTestId('json-viewer')
    expect(viewer.style.maxHeight).toBe('200px')
  })

  it('renders with monospace font', () => {
    render(<JsonViewer data={{ key: 'value' }} />)
    const viewer = screen.getByTestId('json-viewer')
    expect(viewer.className).toContain('font-mono')
  })
})
