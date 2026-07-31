import { BellOff, CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { DashboardData, NetdataAlert } from '../lib/types'
import { cleanLabel, cn, formatValue, timeAgo } from '../lib/utils'
import { Badge, Card, EmptyState } from '../components/ui'

type Filter = 'active' | 'all' | 'clear'

export function AlertsPage({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<Filter>('active')
  const active = data.alerts.filter((alert) => ['WARNING', 'CRITICAL'].includes(alert.status))
  const visible = filter === 'all' ? data.alerts : filter === 'active' ? active : data.alerts.filter((alert) => alert.status === 'CLEAR')
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Health</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Alerts</h1><p className="mt-1 text-sm text-muted-foreground">What needs your attention, in one place.</p></div><Badge tone={active.length ? 'warning' : 'success'}>{active.length ? `${active.length} active` : 'All clear'}</Badge></div>
    <div className="grid grid-cols-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">{(['active', 'all', 'clear'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={cn('rounded-lg px-3 py-2 text-xs font-semibold capitalize transition', filter === item ? 'bg-white/[0.08] text-foreground shadow-sm' : 'text-muted-foreground')}>{item}{item === 'active' ? ` (${active.length})` : ''}</button>)}</div>
    {visible.length ? <div className="space-y-3">{visible.map((alert) => <AlertCard key={alert.id} alert={alert} />)}</div> : <Card><EmptyState icon={<BellOff size={22}/>} title="No active alerts" description="Your Netdata health checks are clear. New issues will appear here automatically." /></Card>}
  </div>
}

function AlertCard({ alert }: { alert: NetdataAlert }) {
  const tone = alert.status === 'CRITICAL' ? 'danger' : alert.status === 'WARNING' ? 'warning' : 'success'
  const Icon = alert.status === 'CRITICAL' ? CircleAlert : alert.status === 'WARNING' ? TriangleAlert : CheckCircle2
  return <Card className="overflow-hidden"><div className={cn('h-0.5', tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning' : 'bg-accent')} /><div className="p-4"><div className="flex items-start gap-3"><span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone === 'danger' ? 'bg-danger/10 text-danger' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent')}><Icon size={19}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{cleanLabel(alert.name)}</p><Badge tone={tone}>{alert.status}</Badge></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.summary}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-white/[0.055] pt-3 text-xs"><span className="truncate text-muted-foreground">{alert.chart}</span><span className="ml-3 flex shrink-0 items-center gap-3"><b>{formatValue(alert.value, alert.units)}</b><span className="text-muted-foreground">{timeAgo(alert.updatedAt)}</span></span></div></div></Card>
}
