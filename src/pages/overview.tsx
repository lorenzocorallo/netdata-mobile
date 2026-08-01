import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, BellRing, Cpu, Database, HardDrive, Layers3, MemoryStick, Network, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '../components/ui'
import type { DashboardData, MetricSeries, ViewName } from '../lib/types'
import { cn, formatBytes, formatValue, timeAgo } from '../lib/utils'
import { ZfsSection } from './zfs'

function findSeries(data: DashboardData, terms: string[]) {
  return Object.values(data.series).find((series) => terms.some((term) => `${series.definition.id} ${series.definition.context}`.includes(term)))
}

function findDiskSeries(data: DashboardData) {
  const candidates = Object.values(data.series).filter((series) => series.definition.context === 'disk.space')
  const root = candidates.find((series) => /(^|\/|root)/i.test(`${series.definition.id} ${series.definition.family} ${series.definition.title}`) && series.latest > 0)
  const pool = Object.values(data.series).find((series) => series.definition.context === 'zfspool.pool_space_usage' && series.latest > 0)
  return root ?? candidates.find((series) => series.latest > 0) ?? pool ?? candidates[0]
}

function getUsefulMetrics(data: DashboardData, excluded: Set<string>) {
  const terms = [['system.load'], ['system.io'], ['system.processes'], ['sensors.'], ['system.uptime'], ['apps.cpu']]
  const found: MetricSeries[] = []
  for (const candidates of terms) {
    const series = findSeries(data, candidates)
    if (series && !excluded.has(series.definition.id) && !found.some((item) => item.definition.id === series.definition.id)) found.push(series)
  }
  return found
}

const iconMap = { cpu: Cpu, memory: MemoryStick, disk: HardDrive, network: Network }

export function OverviewPage({ data, setView, openMetric }: { data: DashboardData; setView: (view: ViewName) => void; openMetric: (series: MetricSeries) => void }) {
  const diskSeries = findDiskSeries(data)
  const statSeries = [
    { key: 'cpu', label: 'CPU', series: findSeries(data, ['system.cpu']) },
    { key: 'memory', label: 'Memory', series: findSeries(data, ['system.ram']) },
    { key: 'disk', label: 'Disk', series: diskSeries },
    { key: 'network', label: 'Network', series: findSeries(data, ['net.']) }
  ]
  const statIds = new Set(statSeries.flatMap(({ series }) => series ? [series.definition.id] : []))
  const usefulMetrics = getUsefulMetrics(data, statIds)
  const activeAlerts = data.alerts.filter((alert) => alert.status === 'WARNING' || alert.status === 'CRITICAL')
  const diskFallback = data.zfs.pools.reduce((total, pool) => total + pool.allocated, 0)

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-lg font-bold tracking-tight">Overview</h1><p className="truncate text-[11px] text-muted-foreground">{data.node.hostname} · {data.node.version}</p></div><Badge tone={activeAlerts.length ? 'warning' : 'success'}>{activeAlerts.length ? `${activeAlerts.length} active` : 'Healthy'}</Badge></div>

    <section className="grid grid-cols-2 gap-1.5" aria-label="Key metrics">
      {statSeries.map(({ key, label, series }) => <StatCard key={key} label={label} series={series} icon={iconMap[key as keyof typeof iconMap]} fallback={key === 'disk' && diskFallback > 0 ? formatBytes(diskFallback) : undefined} onOpen={series ? () => openMetric(series) : undefined} />)}
    </section>

    <MemoryFootprint data={data} onSeeMetrics={() => setView('metrics')}/>

    <ZfsSection data={data} onSeeMetrics={() => setView('metrics')}/>

    {usefulMetrics.length > 0 && <section><SectionTitle title="Useful metrics" action="See all" onAction={() => setView('metrics')} /><div className="grid grid-cols-2 gap-1.5">{usefulMetrics.map((series) => <UsefulMetricCard key={series.definition.id} series={series} open={() => openMetric(series)}/>)}</div></section>}

    <section><SectionTitle title="Health" action="All alerts" onAction={() => setView('alerts')} /><Card className="divide-y divide-line overflow-hidden">{data.alerts.slice(0, 3).map((alert) => <div key={alert.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5"><span className={cn('text-accent', alert.status !== 'CLEAR' && 'text-warning')}>{alert.status === 'CLEAR' ? <ShieldCheck size={15}/> : <BellRing size={15}/>}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{alert.name.replaceAll('_', ' ')}</p><p className="truncate text-[9px] text-muted-foreground">{alert.chart}</p></div><span className="text-[9px] text-muted-foreground">{timeAgo(alert.updatedAt)}</span></div>)}</Card></section>
  </div>
}

function StatCard({ label, series, icon: Icon, fallback, onOpen }: { label: string; series?: MetricSeries; icon: typeof Cpu; fallback?: string; onOpen?: () => void }) {
  const change = series?.change ?? 0
  const value = series && (series.latest !== 0 || !fallback) ? formatValue(series.latest, series.definition.units) : fallback ?? '—'
  const content = <><div className="flex items-center justify-between"><Icon size={14} className="text-accent"/>{series && <span className={cn('flex items-center text-[9px]', change > 0.3 ? 'text-warning' : 'text-accent')}>{change > 0.3 ? <ArrowUp size={9}/> : <ArrowDown size={9}/>} {Math.abs(change).toFixed(1)}%</span>}</div><p className="mt-2 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-base font-bold" title={value}>{value}</p></>
  return <Card className="min-w-0 p-3">{onOpen ? <button type="button" onClick={onOpen} aria-label={`${label} ${series?.definition.title ?? ''}`} className="block w-full text-left">{content}</button> : content}</Card>
}

function MemoryFootprint({ data, onSeeMetrics }: { data: DashboardData; onSeeMetrics: () => void }) {
  const arc = findSeries(data, ['zfs.arc_size', 'zfs.arc'])
  const virtualization = Object.values(data.series).filter((series) => {
    const text = `${series.definition.id} ${series.definition.title} ${series.definition.family} ${series.definition.context}`.toLowerCase()
    return /(qemu|lxc|container|cgroup|virtual.?machine|vm)/.test(text) && /(mem|ram)/.test(text)
  })
  const virtualizationBytes = virtualization.map(metricToBytes).filter((value): value is number => value !== null).reduce((sum, value) => sum + value, 0)
  if (!arc && virtualization.length === 0) return null
  return <section><SectionTitle title="Memory footprint" action="See metrics" onAction={onSeeMetrics}/><Card className="grid grid-cols-2 gap-px overflow-hidden bg-line"><MemoryFootprintCard icon={Database} label="ZFS ARC cache" value={arc ? formatMemoryMetric(arc) : 'Not exposed'} detail={arc ? 'kernel cache' : 'no ARC chart loaded'} /><MemoryFootprintCard icon={Layers3} label="VM / LXC memory" value={virtualizationBytes > 0 ? formatBytes(virtualizationBytes) : 'Not exposed'} detail={virtualizationBytes > 0 ? `${virtualization.length} charts combined` : 'agent did not expose byte values'} /></Card></section>
}

function metricToBytes(series: MetricSeries) {
  const units = series.definition.units.toLowerCase().replaceAll(' ', '')
  const multiplier = units.includes('tib') ? 1024 ** 4 : units.includes('gib') ? 1024 ** 3 : units.includes('mib') ? 1024 ** 2 : units.includes('kib') ? 1024 : units === 'b' || units.includes('byte') ? 1 : null
  return multiplier === null ? null : series.latest * multiplier
}

function formatMemoryMetric(series: MetricSeries) {
  const bytes = metricToBytes(series)
  return bytes === null ? formatValue(series.latest, series.definition.units) : formatBytes(bytes)
}

function MemoryFootprintCard({ icon: Icon, label, value, detail }: { icon: typeof Database; label: string; value: string; detail: string }) {
  return <div className="min-w-0 bg-card p-3"><Icon size={14} className="text-accent"/><p className="mt-2 truncate text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-bold" title={value}>{value}</p><p className="mt-1 truncate text-[9px] text-muted-foreground">{detail}</p></div>
}

function UsefulMetricCard({ series, open }: { series: MetricSeries; open: () => void }) {
  const positive = series.change > 0
  return <button type="button" onClick={open} className="min-w-0 rounded-xl border border-line bg-card p-3 text-left transition hover:bg-accent/[0.035]"><div className="flex items-center justify-between gap-2"><p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{series.definition.family}</p><span className={cn('flex shrink-0 items-center text-[9px]', positive ? 'text-warning' : 'text-accent')}>{positive ? <ArrowUpRight size={9}/> : <ArrowDownRight size={9}/>} {Math.abs(series.change).toFixed(1)}%</span></div><p className="mt-2 truncate text-xs font-semibold" title={series.definition.title}>{series.definition.title}</p><p className="mt-0.5 truncate text-sm font-bold" title={formatValue(series.latest, series.definition.units)}>{formatValue(series.latest, series.definition.units)}</p></button>
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="mb-1.5 flex items-center justify-between"><h2 className="text-xs font-semibold">{title}</h2><button type="button" onClick={onAction} className="text-[10px] font-semibold text-accent">{action}</button></div>
}
