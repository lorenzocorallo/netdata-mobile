import type { AlertStatus, DashboardData, MetricDefinition, MetricSeries, NetdataAlert } from './types'

const definitions: MetricDefinition[] = [
  { id: 'system.cpu', title: 'CPU utilization', family: 'System', context: 'system.cpu', units: '%', priority: 1, dimensions: ['user', 'system', 'iowait'] },
  { id: 'system.ram', title: 'Memory used', family: 'System', context: 'system.ram', units: '%', priority: 2, dimensions: ['used'] },
  { id: 'system.load', title: 'System load', family: 'System', context: 'system.load', units: 'load', priority: 3, dimensions: ['load1'] },
  { id: 'system.io', title: 'Disk throughput', family: 'Storage', context: 'system.io', units: 'MiB/s', priority: 4, dimensions: ['read', 'write'] },
  { id: 'disk_space.root', title: 'Root filesystem', family: 'Storage', context: 'disk.space', units: '%', priority: 5, dimensions: ['used'] },
  { id: 'net.eno1', title: 'Network traffic', family: 'Network', context: 'net.net', units: 'Mbit/s', priority: 6, dimensions: ['received', 'sent'] },
  { id: 'system.processes', title: 'Running processes', family: 'Processes', context: 'system.processes', units: 'processes', priority: 7, dimensions: ['running'] },
  { id: 'system.uptime', title: 'System uptime', family: 'System', context: 'system.uptime', units: 'days', priority: 8, dimensions: ['uptime'] },
  { id: 'sensors.temp', title: 'CPU package', family: 'Sensors', context: 'sensors.temperature', units: '°C', priority: 9, dimensions: ['temperature'] },
  { id: 'apps.cpu', title: 'Applications CPU', family: 'Applications', context: 'apps.cpu', units: '%', priority: 10, dimensions: ['qemu', 'systemd', 'containers'] },
  { id: 'zfs.arc_size', title: 'ZFS ARC size', family: 'ZFS', context: 'zfs.arc_size', units: 'GiB', priority: 11, dimensions: ['size'] },
  { id: 'zfs.pool_health', title: 'ZFS pool utilization', family: 'ZFS', context: 'zfs.pool', units: '%', priority: 12, dimensions: ['used'] }
]

const profiles: Record<string, { base: number; wave: number; noise: number; trend?: number }> = {
  'system.cpu': { base: 31.8, wave: 16, noise: 6 },
  'system.ram': { base: 68.4, wave: 2.5, noise: 0.8, trend: 1 },
  'system.load': { base: 2.16, wave: 0.9, noise: 0.25 },
  'system.io': { base: 18.3, wave: 12, noise: 7 },
  'disk_space.root': { base: 74.2, wave: 0.2, noise: 0.1, trend: 0.4 },
  'net.eno1': { base: 42.6, wave: 34, noise: 15 },
  'system.processes': { base: 287, wave: 18, noise: 8 },
  'system.uptime': { base: 23.7, wave: 0, noise: 0, trend: 0.1 },
  'sensors.temp': { base: 55.2, wave: 7, noise: 2.2 },
  'apps.cpu': { base: 21.1, wave: 11, noise: 4 },
  'zfs.arc_size': { base: 12.8, wave: 0.8, noise: 0.2 },
  'zfs.pool_health': { base: 62.4, wave: 0.1, noise: 0.05 }
}

function seededNoise(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
  return (value - Math.floor(value)) * 2 - 1
}

export function buildDemoSeries(definition: MetricDefinition, rangeSeconds = 1800, points = 60): MetricSeries {
  const profile = profiles[definition.id] ?? { base: 20, wave: 8, noise: 3 }
  const end = Math.floor(Date.now() / 10000) * 10000
  const series = definition.dimensions.slice(0, 3).flatMap((name, seriesIndex) =>
    Array.from({ length: points }, (_, index) => {
      const phase = index / Math.max(1, points - 1)
      const scale = seriesIndex === 0 ? 1 : 0.42 / seriesIndex
      const value = Math.max(0, (profile.base + Math.sin(phase * Math.PI * 4 + seriesIndex) * profile.wave + seededNoise(index + Math.floor(end / 10000), seriesIndex + definition.priority) * profile.noise + (profile.trend ?? 0) * phase) * scale)
      return { time: new Date(end - rangeSeconds * 1000 + phase * rangeSeconds * 1000), value, series: name }
    })
  )
  const primary = series.filter((point) => point.series === definition.dimensions[0])
  const values = primary.map((point) => point.value)
  const latest = values.at(-1) ?? 0
  const previous = values.at(-6) ?? latest
  const rawChange = previous === 0 ? 0 : ((latest - previous) / Math.max(Math.abs(previous), profile.base * 0.25)) * 100
  return {
    definition,
    points: series,
    latest,
    change: Math.max(-99, Math.min(99, rawChange)),
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

function demoAlert(id: string, status: AlertStatus, name: string, chart: string, value: number, units: string, summary: string, minutesAgo: number): NetdataAlert {
  return { id, status, name, chart, family: chart.split('.')[0] ?? 'system', value, units, summary, updatedAt: Date.now() - minutesAgo * 60_000 }
}

export function buildDemoData(rangeSeconds = 1800): DashboardData {
  const series = Object.fromEntries(definitions.map((definition) => [definition.id, buildDemoSeries(definition, rangeSeconds)]))
  return {
    node: { hostname: 'pve-homelab', os: 'Debian GNU/Linux 13', kernel: '6.12.8-2-pve', version: 'v2.6.3', timezone: 'Europe/Rome', mirroredHosts: 1 },
    metrics: definitions,
    series,
    alerts: [
      demoAlert('1', 'WARNING', 'disk_space_usage', 'disk_space.root', 84.7, '%', 'Root filesystem is approaching its warning threshold.', 12),
      demoAlert('2', 'CLEAR', '10min_cpu_usage', 'system.cpu', 31.8, '%', 'CPU utilization returned to normal.', 43),
      demoAlert('3', 'CLEAR', 'ram_in_use', 'system.ram', 68.4, '%', 'Available memory is within the expected range.', 82)
    ],
    connectedAt: Date.now()
  }
}

export const demoDefinitions = definitions
