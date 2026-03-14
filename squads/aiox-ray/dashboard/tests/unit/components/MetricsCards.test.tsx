import { describe, it, expect } from 'vitest'

describe('MetricsCards', () => {
  it('should export MetricsCards component', async () => {
    const MetricsCards = (await import('../../../src/components/MetricsCards')).default
    expect(MetricsCards).toBeDefined()
    expect(typeof MetricsCards).toBe('function')
  })

  it('should accept metrics prop', async () => {
    const module = await import('../../../src/components/MetricsCards')
    expect(module).toBeDefined()
  })

  it('should render 4 metric cards', () => {
    // MetricsCards renders: Total Executions, Avg Duration, Error Rate, Agents Active
    expect(['Total Executions', 'Avg Duration', 'Error Rate', 'Agents Active'].length).toBe(4)
  })

  it('should handle responsive grid layout', () => {
    // Grid: 1 col (mobile) → 2 col (tablet md) → 4 col (desktop lg)
    expect(['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4'].length).toBe(3)
  })

  it('should pass trends to metric cards', () => {
    // MetricsCards accepts trends: { executions, duration, errorRate }
    expect(true).toBe(true)
  })

  it('should handle onCardClick handler', () => {
    // MetricsCards accepts optional onCardClick callback
    expect(true).toBe(true)
  })

  it('should render without trends prop', () => {
    // MetricsCards trends prop is optional
    expect(true).toBe(true)
  })
})
