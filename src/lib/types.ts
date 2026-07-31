export type ConnectionMode = 'demo' | 'live'
export type ViewName = 'overview' | 'metrics' | 'alerts' | 'settings'
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
  connectedAt: number
}

export interface RawChart {
  id?: string
  name?: string
  title?: string
  family?: string
  context?: string
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
