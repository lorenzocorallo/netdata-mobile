import { describe, expect, it } from 'vitest'
import { parseMetricSeries } from './netdata-client'

describe('parseMetricSeries', () => {
  it('normalizes reverse chronological Netdata rows into chart points', () => {
    const definition = { id: 'system.cpu', title: 'CPU', family: 'System', context: 'system.cpu', units: '%', priority: 1, dimensions: ['user'] }
    const result = parseMetricSeries(definition, { labels: ['time', 'user'], data: [[200, 20], [100, 10]], min: 10, max: 20 })
    expect(result.points.map((point) => point.value)).toEqual([10, 20])
    expect(result.latest).toBe(20)
    expect(result.min).toBe(10)
    expect(result.max).toBe(20)
  })
})
