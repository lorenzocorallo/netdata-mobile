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

  it('summarizes total CPU across every non-idle dimension', () => {
    const definition = { id: 'system.cpu', title: 'CPU', family: 'System', context: 'system.cpu', units: '%', priority: 1, dimensions: [] }
    const result = parseMetricSeries(definition, {
      labels: ['time', 'guest_nice', 'guest', 'steal', 'softirq', 'irq', 'user', 'idle'],
      data: [[200, 0, 0, 0.3, 0.4, 0.2, 3.1, 95], [100, 0, 0, 0.1, 0.2, 0.1, 1.6, 98]]
    })
    expect(result.latest).toBeCloseTo(4)
    expect(result.min).toBeCloseTo(2)
    expect(result.max).toBeCloseTo(4)
  })

  it('uses the used dimension for RAM summaries even when free is first', () => {
    const definition = { id: 'system.ram', title: 'RAM', family: 'RAM', context: 'system.ram', units: 'MiB', priority: 1, dimensions: [] }
    const result = parseMetricSeries(definition, { labels: ['time', 'free', 'used', 'cached'], data: [[100, 15000, 4200, 8000]] })
    expect(result.latest).toBe(4200)
    expect(result.min).toBe(4200)
    expect(result.max).toBe(4200)
  })

  it('falls back to available capacity when a disk chart has no used dimension values', () => {
    const definition = { id: 'disk_space._data', title: 'Data', family: '/data', context: 'disk.space', units: 'GiB', priority: 1, dimensions: [] }
    const result = parseMetricSeries(definition, { labels: ['time', 'used', 'avail'], data: [[100, 0, 613], [200, 0, 612]] })
    expect(result.latest).toBe(612)
    expect(result.min).toBe(612)
    expect(result.max).toBe(613)
  })
})
