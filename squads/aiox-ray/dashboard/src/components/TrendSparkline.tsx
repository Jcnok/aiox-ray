import React from 'react'
import { ComposedChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface TrendSparklineProps {
  data: number[]
  isPositive: boolean
  height?: number
  width?: string
}

export default function TrendSparkline({
  data,
  isPositive,
  height = 50,
  width = 'w-32',
}: TrendSparklineProps) {
  if (!data || data.length === 0) {
    return <div className={`${width} h-12 bg-gray-800 rounded`} />
  }

  // Format data for Recharts
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <div className={width}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData}>
          <XAxis dataKey="index" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            dot={false}
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
