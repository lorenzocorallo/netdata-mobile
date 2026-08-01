import { ArrowDown, ArrowUp, BellRing, Cpu, HardDrive, MemoryStick, Network, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '../components/ui'
import type { DashboardData, MetricSeries, ViewName } from '../lib/types'
import { cn, formatValue, timeAgo } from '../lib/utils'
import { ZfsSection } from './zfs'

function findSeries(data: DashboardData, terms: string[]) {
  return Object.values(data.series).find((series) => terms.some((term) => `${series.definition.id} ${series.definition.context}`.includes(term)))
}

const iconMap = { cpu: Cpu, memory: MemoryStick, disk: HardDrive, network: Network }

export function OverviewPage({ data, setView, openMetric }: { data: DashboardData; setView: (view: ViewName) => void; openMetric: (series: MetricSeries) => void }) {
  const statSeries = [
    { key: 'cpu', label: 'CPU', series: findSeries(data, ['system.cpu']) },
    { key: 'memory', label: 'Memory', series: findSeries(data, ['system.ram']) },
    { key: 'disk', label: 'Disk', series: findSeries(data, ['disk_space', 'disk.space']) },
    { key: 'network', label: 'Network', series: findSeries(data, ['net.']) }
  ]
  const highlighted = Object.values(data.series).filter((series) => !series.definition.context.startsWith('zfs') && !series.definition.context.startsWith('zfspool')).slice(0, 6)
  const activeAlerts = data.alerts.filter((alert) => alert.status === 'WARNING' || alert.status === 'CRITICAL')

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-lg font-bold tracking-tight">Overview</h1><p className="truncate text-[11px] text-muted-foreground">{data.node.hostname} · {data.node.version}</p></div><Badge tone={activeAlerts.length ? 'warning' : 'success'}>{activeAlerts.length ? `${activeAlerts.length} active` : 'Healthy'}</Badge></div>

    <section className="grid grid-cols-2 gap-1.5" aria-label="Key metrics">
      {statSeries.map(({ key, label, series }) => <StatCard key={key} label={label} series={series} icon={iconMap[key as keyof typeof iconMap]} />)}
    </section>

    <ZfsSection data={data} openMetric={openMetric}/>

    <section><SectionTitle title="Live metrics" action="All metrics" onAction={() => setView('metrics')} /><Card className="divide-y divide-line overflow-hidden">{highlighted.map((series) => <button type="button" key={series.definition.id} onClick={() => openMetric(series)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-accent/[0.035]"><span className="min-w-0"><span className="block truncate text-xs font-semibold">{series.definition.title}</span><span className="block truncate text-[9px] text-muted-foreground">{series.definition.family}</span></span><span className="text-right"><span className="block text-xs font-bold">{formatValue(series.latest, series.definition.units)}</span><span className={cn('flex items-center justify-end text-[9px]', series.change > 0 ? 'text-warning' : 'text-accent')}>{series.change > 0 ? <ArrowUp size={9}/> : <ArrowDown size={9}/>} {Math.abs(series.change).toFixed(1)}%</span></span></button>)}</Card></section>

    <section><SectionTitle title="Health" action="All alerts" onAction={() => setView('alerts')} /><Card className="divide-y divide-line overflow-hidden">{data.alerts.slice(0, 3).map((alert) => <div key={alert.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5"><span className={cn('text-accent', alert.status !== 'CLEAR' && 'text-warning')}>{alert.status === 'CLEAR' ? <ShieldCheck size={15}/> : <BellRing size={15}/>}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{alert.name.replaceAll('_', ' ')}</p><p className="truncate text-[9px] text-muted-foreground">{alert.chart}</p></div><span className="text-[9px] text-muted-foreground">{timeAgo(alert.updatedAt)}</span></div>)}</Card></section>
  </div>
}

function StatCard({ label, series, icon: Icon }: { label: string; series?: MetricSeries; icon: typeof Cpu }) {
  const change = series?.change ?? 0
  return <Card className="min-w-0 p-3"><div className="flex items-center justify-between"><Icon size={14} className="text-accent"/><span className={cn('flex items-center text-[9px]', change > 0.3 ? 'text-warning' : 'text-accent')}>{change > 0.3 ? <ArrowUp size={9}/> : <ArrowDown size={9}/>}{Math.abs(change).toFixed(1)}%</span></div><p className="mt-2 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-base font-bold" title={series ? formatValue(series.latest, series.definition.units) : '—'}>{series ? formatValue(series.latest, series.definition.units) : '—'}</p></Card>
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="mb-1.5 flex items-center justify-between"><h2 className="text-xs font-semibold">{title}</h2><button type="button" onClick={onAction} className="text-[10px] font-semibold text-accent">{action}</button></div>
}
