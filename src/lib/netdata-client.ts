import { buildDemoData } from './demo-data'
import { pointsForRange } from './time-ranges'
import type { AppSettings, DashboardData, MetricDefinition, MetricSeries, NetdataAlert, RawChartsResponse, RawDataResponse, ZfsInventory } from './types'

const preferredCharts = ['system.cpu', 'system.ram', 'system.load', 'system.io', 'net.', 'system.processes', 'system.uptime', 'sensors.', 'apps.cpu']
const emptyZfs: ZfsInventory = { available: false, source: 'unavailable', pools: [], datasets: [] }

function normalizeBase(base: string) {
  return base.trim().replace(/\/+$/, '') || '/netdata'
}

async function getJson<T>(base: string, path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${normalizeBase(base)}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Netdata returned ${response.status} ${response.statusText}`)
  return response.json() as Promise<T>
}

function parseDefinitions(raw: RawChartsResponse): MetricDefinition[] {
  return Object.entries(raw.charts ?? {}).map(([key, chart]) => ({
    id: chart.id || key,
    title: chart.title || chart.name || key,
    family: chart.family || 'Other',
    context: chart.context || key,
    units: chart.units || '',
    priority: chart.priority ?? 99999,
    dimensions: Object.values(chart.dimensions ?? {}).map((dimension) => dimension.name || 'value')
  })).sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}

function pickImportant(definitions: MetricDefinition[], zfs: ZfsInventory, count = 16) {
  const selected: MetricDefinition[] = []
  for (const prefix of preferredCharts) {
    const match = definitions.find((definition) => !selected.includes(definition) && (definition.id === prefix || definition.id.startsWith(prefix)))
    if (match) selected.push(match)
  }
  for (const definition of definitions.filter(isVirtualizationMemoryMetric).slice(0, 6)) {
    if (!selected.includes(definition)) selected.push(definition)
  }
  const poolNames = zfs.pools.map((pool) => pool.name.toLowerCase())
  for (const definition of definitions) {
    const context = definition.context.toLowerCase()
    const family = definition.family.toLowerCase()
    const isZfsMetric = context.startsWith('zfs.') || context.startsWith('zfspool.')
    const isZfsMount = context === 'disk.space' && (poolNames.length === 0 || poolNames.some((pool) => family === `/${pool}` || family.startsWith(`/${pool}/`)))
    if ((isZfsMetric || isZfsMount) && !selected.includes(definition)) selected.push(definition)
  }
  for (const definition of definitions) {
    if (selected.length >= count) break
    if (!selected.includes(definition)) selected.push(definition)
  }
  return selected
}

function isVirtualizationMemoryMetric(definition: MetricDefinition) {
  const text = `${definition.id} ${definition.title} ${definition.family} ${definition.context}`.toLowerCase()
  return /(qemu|lxc|container|cgroup|virtual.?machine|vm)/.test(text) && /(mem|ram)/.test(text)
}

async function fetchZfsInventory(settings: AppSettings, signal?: AbortSignal): Promise<ZfsInventory> {
  if (settings.mode === 'demo') return buildDemoData().zfs
  if (!settings.apiBase.startsWith('/')) return { ...emptyZfs, error: 'ZFS inventory requires the bundled local service.' }
  try {
    const response = await fetch('/_zfs', { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Inventory returned ${response.status}`)
    return await response.json() as ZfsInventory
  } catch (error) {
    return { ...emptyZfs, error: error instanceof Error ? error.message : 'ZFS inventory unavailable' }
  }
}

export function parseMetricSeries(definition: MetricDefinition, raw: RawDataResponse): MetricSeries {
  const labels = raw.labels ?? []
  const dimensionLabels = labels.slice(1)
  const rows = [...(raw.data ?? [])].sort((a, b) => Number(a[0] ?? 0) - Number(b[0] ?? 0))
  const points = rows.flatMap((row) => dimensionLabels.map((series, index) => ({
    time: new Date((row[0] ?? 0) * 1000),
    value: Number(row[index + 1] ?? 0),
    series
  })))
  const values = summaryValues(definition, dimensionLabels, rows)
  const latest = values.at(-1) ?? 0
  const previous = values.at(-6) ?? latest
  return {
    definition: { ...definition, dimensions: dimensionLabels.length ? dimensionLabels : definition.dimensions },
    points,
    latest,
    change: previous === 0 ? (latest === 0 ? 0 : 100) : ((latest - previous) / Math.abs(previous)) * 100,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0
  }
}

function summaryValues(definition: MetricDefinition, dimensions: string[], rows: Array<Array<number | null>>) {
  const normalized = dimensions.map((dimension) => dimension.toLowerCase())
  if (definition.context === 'system.cpu' || definition.id === 'system.cpu') {
    const indexes = normalized.map((dimension, index) => ({ dimension, index })).filter(({ dimension }) => dimension !== 'idle').map(({ index }) => index + 1)
    return rows.map((row) => indexes.reduce((total, index) => total + Number(row[index] ?? 0), 0))
  }
  const preferredDimension = definition.context === 'system.ram' || definition.context === 'disk.space' || definition.context === 'zfspool.pool_space_usage' ? 'used' : null
  const preferredIndex = preferredDimension ? normalized.indexOf(preferredDimension) : -1
  const valueIndex = (preferredIndex >= 0 ? preferredIndex : 0) + 1
  const values = rows.map((row) => Number(row[valueIndex] ?? 0))
  if (definition.context !== 'disk.space' || values.some((value) => value !== 0)) return values

  // Some Netdata disk charts expose only `avail`/`free` for a mount. Keep the
  // overview useful instead of displaying a misleading zero when a positive
  // capacity dimension is available.
  const fallbackIndex = ['avail', 'available', 'free'].map((name) => normalized.indexOf(name)).find((index) => index >= 0)
  if (fallbackIndex === undefined) return values
  return rows.map((row) => Number(row[fallbackIndex + 1] ?? 0))
}

function parseAlerts(raw: unknown): NetdataAlert[] {
  const source = (raw as { alarms?: Record<string, Record<string, unknown>> }).alarms ?? {}
  return Object.entries(source).map(([id, alert]) => ({
    id,
    name: String(alert.name ?? id),
    chart: String(alert.chart ?? alert.context ?? ''),
    family: String(alert.family ?? 'Other'),
    status: String(alert.status ?? 'UNDEFINED').toUpperCase() as NetdataAlert['status'],
    value: Number(alert.value ?? 0),
    units: String(alert.units ?? ''),
    summary: String(alert.info ?? alert.summary ?? 'Netdata health check'),
    updatedAt: Number(alert.last_status_change ?? alert.last_updated ?? Math.floor(Date.now() / 1000)) * 1000
  })).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function fetchDashboard(settings: AppSettings, rangeSeconds = 1800, signal?: AbortSignal): Promise<DashboardData> {
  if (settings.mode === 'demo') return buildDemoData(rangeSeconds)

  const [info, chartResponse, alarms, zfs] = await Promise.all([
    getJson<Record<string, unknown>>(settings.apiBase, '/api/v1/info', signal),
    getJson<RawChartsResponse>(settings.apiBase, '/api/v1/charts', signal),
    getJson<unknown>(settings.apiBase, '/api/v1/alarms?all', signal),
    fetchZfsInventory(settings, signal)
  ])
  const allDefinitions = parseDefinitions(chartResponse)
  const definitions = pickImportant(allDefinitions, zfs)
  const results = await Promise.all(definitions.map(async (definition) => {
    const query = new URLSearchParams({ chart: definition.id, after: String(-rangeSeconds), points: String(pointsForRange(rangeSeconds)), group: 'average', format: 'json' })
    try {
      const raw = await getJson<RawDataResponse>(settings.apiBase, `/api/v1/data?${query.toString()}`, signal)
      return parseMetricSeries(definition, raw)
    } catch {
      return null
    }
  }))
  const fetchedSeries = results.filter((series): series is MetricSeries => series !== null)
  return {
    node: {
      hostname: String(info.hostname ?? info.host ?? 'Netdata node'),
      os: String(info.os_name ?? info.os ?? 'Linux'),
      kernel: String(info.kernel_name ?? info.kernel_version ?? ''),
      version: String(info.version ?? 'Netdata'),
      timezone: String(info.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
      mirroredHosts: Number(info.mirrored_hosts ?? 1)
    },
    metrics: allDefinitions,
    series: Object.fromEntries(fetchedSeries.map((series) => [series.definition.id, series])),
    alerts: parseAlerts(alarms),
    zfs,
    connectedAt: Date.now()
  }
}

export async function testConnection(apiBase: string) {
  const info = await getJson<Record<string, unknown>>(apiBase, '/api/v1/info')
  return String(info.hostname ?? info.host ?? 'Netdata node')
}
