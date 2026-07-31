export type ConnectionMode = 'demo' | 'live'
export type ViewName = 'overview' | 'metrics' | 'zfs' | 'alerts' | 'settings'
export type AlertStatus = 'CRITICAL' | 'WARNING' | 'CLEAR' | 'UNDEFINED'

export interface AppSettings {
  apiBase: string
  mode: ConnectionMode
  refreshSeconds: number
}

export interface NodeInfo {
  hostname: string
  os: string
  kernel: string
  version: string
  timezone: string
  mirroredHosts: number
}

export interface MetricDefinition {
  id: string
  title: string
  family: string
  context: string
  units: string
  priority: number
  dimensions: string[]
}

export interface MetricPoint {
  time: Date
  value: number
  series: string
}

export interface MetricSeries {
  definition: MetricDefinition
  points: MetricPoint[]
  latest: number
  change: number
  min: number
  max: number
}

export interface NetdataAlert {
  id: string
  name: string
  chart: string
  family: string
  status: AlertStatus
  value: number
  units: string
  summary: string
  updatedAt: number
}

export interface DashboardData {
  node: NodeInfo
  metrics: MetricDefinition[]
  series: Record<string, MetricSeries>
  alerts: NetdataAlert[]
  zfs: ZfsInventory
  connectedAt: number
}

export interface ZfsPool {
  name: string
  size: number
  allocated: number
  free: number
  fragmentation: number | null
  capacity: number
  health: string
}

export interface ZfsDataset {
  name: string
  pool: string
  parent: string | null
  depth: number
  type: string
  mountpoint: string
  used: number
  available: number
  referenced: number
  quota: number | null
  usedBySnapshots: number
  usedByDataset: number
  usedByChildren: number
}

export interface ZfsInventory {
  available: boolean
  source: 'local-zfs' | 'demo' | 'unavailable'
  pools: ZfsPool[]
  datasets: ZfsDataset[]
  error?: string
}

export interface RawChart {
  id?: string
  name?: string
  title?: string
  family?: string
  context?: string
  type?: string
  units?: string
  priority?: number
  dimensions?: Record<string, { name?: string }>
}

export interface RawChartsResponse {
  charts?: Record<string, RawChart>
}

export interface RawDataResponse {
  labels?: string[]
  data?: Array<Array<number | null>>
  min?: number
  max?: number
}
