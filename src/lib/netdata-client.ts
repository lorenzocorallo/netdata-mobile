import { buildDemoData } from './demo-data'
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
  const points = (raw.data ?? []).flatMap((row) => dimensionLabels.map((series, index) => ({
    time: new Date((row[0] ?? 0) * 1000),
    value: Number(row[index + 1] ?? 0),
    series
  }))).sort((a, b) => a.time.getTime() - b.time.getTime())
  const primaryName = dimensionLabels[0]
  const primary = points.filter((point) => point.series === primaryName).map((point) => point.value)
  const latest = primary.at(-1) ?? 0
  const previous = primary.at(-6) ?? latest
  return {
    definition: { ...definition, dimensions: dimensionLabels.length ? dimensionLabels : definition.dimensions },
    points,
    latest,
    change: previous === 0 ? 0 : ((latest - previous) / Math.abs(previous)) * 100,
    min: raw.min ?? (primary.length ? Math.min(...primary) : 0),
    max: raw.max ?? (primary.length ? Math.max(...primary) : 0)
  }
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
    const query = new URLSearchParams({ chart: definition.id, after: String(-rangeSeconds), points: '60', group: 'average', format: 'json' })
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
