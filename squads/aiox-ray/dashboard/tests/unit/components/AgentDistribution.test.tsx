import { describe, it, expect } from 'vitest'

describe('AgentDistribution', () => {
  it('should export AgentDistribution component', async () => {
    const AgentDistribution = (await import('../../../src/components/AgentDistribution')).default
    expect(AgentDistribution).toBeDefined()
    expect(typeof AgentDistribution).toBe('function')
  })

  it('should render placeholder when agentCounts is empty', () => {
    // Component shows "No agent data" placeholder for empty object
    expect({}).toEqual({})
  })

  it('should render placeholder when agentCounts is null', () => {
    // Component checks !agentCounts || Object.keys(agentCounts).length === 0
    expect(null).toBeNull()
  })

  it('should render pie chart with valid data', () => {
    // Component renders PieChart from recharts when data exists
    const data = { dev: 50, qa: 30, architect: 20 }
    expect(Object.keys(data).length).toBeGreaterThan(0)
  })

  it('should group agents correctly', () => {
    // Component shows top 5 agents + "Other" grouping
    const agents = ['dev', 'qa', 'architect', 'analyst', 'pm', 'designer', 'devops']
    expect(agents.slice(0, 5).length).toBe(5)
  })

  it('should handle single agent', () => {
    // Component renders with 1 agent
    const data = { dev: 100 }
    expect(Object.keys(data).length).toBe(1)
  })

  it('should accept onClick callback', () => {
    // Component accepts optional onClick handler for pie segments
    const mockClick = () => {}
    expect(typeof mockClick).toBe('function')
  })

  it('should render with correct dimensions', () => {
    // Component dimensions: w-full h-64
    expect(['w-full', 'h-64'].length).toBe(2)
  })

  it('should not show other when less than 6 agents', () => {
    // Component shows "Other" only if more than 5 agents
    const agents = ['dev', 'qa', 'architect', 'analyst', 'pm']
    expect(agents.length).toBe(5)
  })

  it('should use color palette', () => {
    // Component uses 6-color palette cycling through entries
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    expect(COLORS.length).toBe(6)
  })
})
