import React from 'react'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts'

interface AgentDistributionProps {
  agentCounts: Record<string, number>
  onClick?: (agent: string) => void
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AgentDistribution({ agentCounts, onClick }: AgentDistributionProps) {
  if (!agentCounts || Object.keys(agentCounts).length === 0) {
    return (
      <div className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-500">
        No agent data
      </div>
    )
  }

  // Convert to chart data, group small agents as "Other"
  const entries = Object.entries(agentCounts).sort(([, a], [, b]) => b - a)
  const topAgents = entries.slice(0, 5)
  const otherAgents = entries.slice(5)

  const chartData = [
    ...topAgents.map(([agent, count]) => ({
      name: agent,
      value: count,
    })),
    ...(otherAgents.length > 0
      ? [
          {
            name: 'Other',
            value: otherAgents.reduce((sum, [, count]) => sum + count, 0),
          },
        ]
      : []),
  ]

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={(entry) => onClick?.(entry.name as string)}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
