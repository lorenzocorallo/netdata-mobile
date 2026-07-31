import { Activity, ArrowDown, ArrowUp, BellRing, Box, Cpu, HardDrive, MemoryStick, Network, Server, ShieldCheck, Thermometer, Zap } from 'lucide-react'
import type { DashboardData, MetricSeries, ViewName } from '../lib/types'
import { cn, formatValue, timeAgo } from '../lib/utils'
import { MetricChart } from '../components/metric-chart'
import { Badge, Button, Card } from '../components/ui'

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
  const highlighted = Object.values(data.series).slice(0, 4)
  const activeAlerts = data.alerts.filter((alert) => alert.status === 'WARNING' || alert.status === 'CRITICAL')

  return <div className="space-y-6">
    <section className="flex items-end justify-between gap-3">
      <div><p className="eyebrow">Live overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good {greeting()}</h1><p className="mt-1 text-sm text-muted-foreground">Here’s how your host is doing right now.</p></div>
      <Badge tone={activeAlerts.length ? 'warning' : 'success'} className="mb-1 hidden sm:inline-flex">{activeAlerts.length ? `${activeAlerts.length} needs attention` : 'All healthy'}</Badge>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
      {statSeries.map(({ key, label, series }) => <StatCard key={key} label={label} series={series} icon={iconMap[key as keyof typeof iconMap]} />)}
    </section>

    <section>
      <SectionHeader title="Live metrics" description="Last 30 minutes" action="View all" onAction={() => setView('metrics')} />
      <div className="grid gap-3 md:grid-cols-2">{highlighted.map((series) => <MetricPreview key={series.definition.id} series={series} onClick={() => openMetric(series)} />)}</div>
    </section>

    <section className="grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4"><div><p className="font-semibold">Health checks</p><p className="mt-0.5 text-xs text-muted-foreground">Latest alert activity</p></div><Button variant="ghost" size="sm" onClick={() => setView('alerts')}>All alerts</Button></div>
        <div className="divide-y divide-white/[0.055]">{data.alerts.slice(0, 3).map((alert) => <div key={alert.id} className="flex items-center gap-3 p-4"><span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', alert.status === 'CLEAR' ? 'bg-accent/10 text-accent' : alert.status === 'WARNING' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')}>{alert.status === 'CLEAR' ? <ShieldCheck size={18} /> : <BellRing size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{alert.name.replaceAll('_', ' ')}</p><p className="truncate text-xs text-muted-foreground">{alert.summary}</p></div><div className="text-right"><p className="text-xs font-semibold">{formatValue(alert.value, alert.units)}</p><p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(alert.updatedAt)}</p></div></div>)}</div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent"><Server size={19} /></span><div><p className="font-semibold">{data.node.hostname}</p><p className="text-xs text-muted-foreground">{data.node.os}</p></div></div>
        <dl className="mt-5 grid grid-cols-2 gap-3">{[[Box, 'Netdata', data.node.version], [Activity, 'Kernel', data.node.kernel], [Zap, 'Status', 'Connected'], [Thermometer, 'Timezone', data.node.timezone]].map(([Icon, label, value]) => { const Glyph = Icon as typeof Box; return <div key={String(label)} className="rounded-xl bg-white/[0.035] p-3"><Glyph size={15} className="mb-2 text-muted-foreground"/><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{String(label)}</dt><dd className="mt-1 truncate text-xs font-semibold">{String(value)}</dd></div> })}</dl>
      </Card>
    </section>
  </div>
}

function StatCard({ label, series, icon: Icon }: { label: string; series?: MetricSeries; icon: typeof Cpu }) {
  const change = series?.change ?? 0
  return <Card className="relative overflow-hidden p-4"><div className="absolute -right-6 -top-8 size-24 rounded-full bg-accent/[0.035] blur-xl"/><div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground"><Icon size={16} /></span><span className={cn('flex items-center text-[10px] font-semibold', change > 0.3 ? 'text-warning' : 'text-accent')}>{change > 0.3 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(change).toFixed(1)}%</span></div><p className="mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tracking-tight">{series ? formatValue(series.latest, series.definition.units) : '—'}</p></Card>
}

function MetricPreview({ series, onClick }: { series: MetricSeries; onClick: () => void }) {
  return <Card className="group overflow-hidden transition hover:border-accent/20"><button onClick={onClick} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"><div className="flex items-start justify-between px-4 pt-4"><div><p className="text-xs font-medium text-muted-foreground">{series.definition.family}</p><p className="mt-0.5 font-semibold">{series.definition.title}</p></div><div className="text-right"><p className="font-bold">{formatValue(series.latest, series.definition.units)}</p><p className={cn('text-[10px]', series.change > 0 ? 'text-warning' : 'text-accent')}>{series.change > 0 ? '+' : ''}{series.change.toFixed(1)}%</p></div></div><div className="-mb-3 px-1 pt-1"><MetricChart points={series.points} units={series.definition.units} height={130} compact label={series.definition.title} /></div></button></Card>
}

function SectionHeader({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div><button onClick={onAction} className="text-xs font-semibold text-accent hover:underline">{action}</button></div>
}

function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening' }
