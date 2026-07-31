import { areaY, defineChart, lineY } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { useMemo } from 'react'
import type { MetricPoint } from '../lib/types'

interface MetricChartProps {
  points: MetricPoint[]
  units: string
  height?: number
  compact?: boolean
  label: string
}

export function MetricChart({ points, units, height = 180, compact = false, label }: MetricChartProps) {
  const definition = useMemo(() => defineChart({
    marks: [
      areaY(points, { x: 'time', y: 'value', z: 'series', color: 'series', fillOpacity: compact ? 0.08 : 0.12 }),
      lineY(points, { x: 'time', y: 'value', z: 'series', color: 'series', strokeWidth: compact ? 2 : 2.25 })
    ],
    x: { scale: scaleUtc, nice: true },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      format: (value) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Number(value))}${units === '%' ? '%' : ''}`
    },
    tooltip,
    animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }), [compact, points, units])

  return <div className={compact ? 'chart-compact min-w-0 overflow-hidden' : 'chart-full min-w-0 overflow-hidden'}>
    <Chart definition={definition} height={height} initialWidth={280} ariaLabel={`${label} over time`} ariaDescription={`Time series in ${units || 'units'}`} />
  </div>
}
