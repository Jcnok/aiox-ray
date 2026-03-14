import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { FlowLegend } from '../../../src/components/FlowLegend'

describe('FlowLegend', () => {
  it('should render legend container', () => {
    render(<FlowLegend />)
    expect(screen.getByTestId('flow-legend')).toBeDefined()
  })

  it('should show Legend title', () => {
    render(<FlowLegend />)
    expect(screen.getByText('Legend')).toBeDefined()
  })

  it('should show agent and skill icons', () => {
    render(<FlowLegend />)
    expect(screen.getByText('🤖')).toBeDefined()
    expect(screen.getByText('⚡')).toBeDefined()
  })

  it('should show status labels', () => {
    render(<FlowLegend />)
    expect(screen.getByText('Success')).toBeDefined()
    expect(screen.getByText('Error')).toBeDefined()
    expect(screen.getByText('Mixed')).toBeDefined()
  })

  it('should show type labels', () => {
    render(<FlowLegend />)
    expect(screen.getByText('Agent')).toBeDefined()
    expect(screen.getByText('Skill')).toBeDefined()
  })
})
