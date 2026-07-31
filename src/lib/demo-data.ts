import type { AlertStatus, DashboardData, MetricDefinition, MetricSeries, NetdataAlert, ZfsInventory } from './types'

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
  { id: 'zfspool_pool12_space_usage', title: 'Pool12 space usage', family: 'space usage', context: 'zfspool.pool_space_usage', units: 'bytes', priority: 12, dimensions: ['free', 'used'] },
  { id: 'zfspool_pool12_fragmentation', title: 'Pool12 fragmentation', family: 'fragmentation', context: 'zfspool.pool_fragmentation', units: '%', priority: 13, dimensions: ['fragmentation'] },
  { id: 'disk_space._pool12', title: 'Pool12 mount space', family: '/pool12', context: 'disk.space', units: 'GiB', priority: 14, dimensions: ['avail', 'used'] },
  { id: 'disk_space._pool12_media', title: 'Media dataset space', family: '/pool12/media', context: 'disk.space', units: 'GiB', priority: 15, dimensions: ['avail', 'used'] },
  { id: 'disk_space._pool12_backups', title: 'Backups dataset space', family: '/pool12/backups', context: 'disk.space', units: 'GiB', priority: 16, dimensions: ['avail', 'used'] }
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
  'zfspool_pool12_space_usage': { base: 7_900_000_000_000, wave: 90_000_000_000, noise: 20_000_000_000 },
  'zfspool_pool12_fragmentation': { base: 11, wave: 0.4, noise: 0.1 },
  'disk_space._pool12': { base: 4760, wave: 3, noise: 1 },
  'disk_space._pool12_media': { base: 340, wave: 1, noise: 0.3 },
  'disk_space._pool12_backups': { base: 676, wave: 2, noise: 0.4 }
}

const tib = 1024 ** 4
const gib = 1024 ** 3

export const demoZfs: ZfsInventory = {
  available: true,
  source: 'demo',
  pools: [
    { name: 'pool12', size: 12 * tib, allocated: 7.35 * tib, free: 4.65 * tib, fragmentation: 11, capacity: 61.3, health: 'ONLINE' },
    { name: 'fast', size: 1.82 * tib, allocated: 1.12 * tib, free: 0.7 * tib, fragmentation: 4, capacity: 61.5, health: 'ONLINE' }
  ],
  datasets: [
    { name: 'pool12', pool: 'pool12', parent: null, depth: 0, type: 'filesystem', mountpoint: '/pool12', used: 7.35 * tib, available: 4.65 * tib, referenced: 256 * 1024, quota: null, refQuota: null, volumeSize: null, usedBySnapshots: 110 * gib, usedByDataset: 256 * 1024, usedByChildren: 7.24 * tib },
    { name: 'pool12/media', pool: 'pool12', parent: 'pool12', depth: 1, type: 'filesystem', mountpoint: '/pool12/media', used: 684 * gib, available: 340 * gib, referenced: 660 * gib, quota: null, refQuota: 1 * tib, volumeSize: null, usedBySnapshots: 24 * gib, usedByDataset: 660 * gib, usedByChildren: 0 },
    { name: 'pool12/backups', pool: 'pool12', parent: 'pool12', depth: 1, type: 'filesystem', mountpoint: '/pool12/backups', used: 3.42 * tib, available: 676 * gib, referenced: 3.1 * tib, quota: 4 * tib, refQuota: null, volumeSize: null, usedBySnapshots: 328 * gib, usedByDataset: 3.1 * tib, usedByChildren: 0 },
    { name: 'pool12/vmdata', pool: 'pool12', parent: 'pool12', depth: 1, type: 'filesystem', mountpoint: '/pool12/vmdata', used: 2.95 * tib, available: 1.05 * tib, referenced: 2.8 * tib, quota: 20 * tib, refQuota: null, volumeSize: null, usedBySnapshots: 154 * gib, usedByDataset: 2.8 * tib, usedByChildren: 0 },
    { name: 'fast', pool: 'fast', parent: null, depth: 0, type: 'filesystem', mountpoint: '/fast', used: 1.12 * tib, available: 0.7 * tib, referenced: 128 * 1024, quota: null, refQuota: null, volumeSize: null, usedBySnapshots: 0, usedByDataset: 128 * 1024, usedByChildren: 1.12 * tib },
    { name: 'fast/containers', pool: 'fast', parent: 'fast', depth: 1, type: 'filesystem', mountpoint: '/fast/containers', used: 1.12 * tib, available: 0.7 * tib, referenced: 1.09 * tib, quota: null, refQuota: null, volumeSize: null, usedBySnapshots: 31 * gib, usedByDataset: 1.09 * tib, usedByChildren: 0 },
    { name: 'fast/vm-200-disk-0', pool: 'fast', parent: 'fast', depth: 1, type: 'volume', mountpoint: '-', used: 34 * gib, available: 694 * gib, referenced: 22 * gib, quota: null, refQuota: null, volumeSize: 32 * gib, refReservation: 34 * gib, logicalUsed: 27 * gib, logicalReferenced: 26 * gib, usedBySnapshots: 0, usedByDataset: 22 * gib, usedByChildren: 0, usedByRefReservation: 12 * gib }
  ]
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
  const values = definition.context === 'system.cpu'
    ? Array.from({ length: points }, (_, index) => series.filter((_, pointIndex) => pointIndex % points === index).reduce((total, point) => total + point.value, 0))
    : primary.map((point) => point.value)
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
    zfs: demoZfs,
    connectedAt: Date.now()
  }
}

export const demoDefinitions = definitions
