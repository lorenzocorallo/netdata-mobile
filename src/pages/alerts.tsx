import { BellOff, CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Badge, Card, EmptyState } from '../components/ui'
import type { DashboardData, NetdataAlert } from '../lib/types'
import { cleanLabel, cn, formatValue, timeAgo } from '../lib/utils'

type Filter = 'active' | 'all' | 'clear'

export function AlertsPage({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<Filter>('active')
  const active = data.alerts.filter((alert) => ['WARNING', 'CRITICAL'].includes(alert.status))
  const visible = filter === 'all' ? data.alerts : filter === 'active' ? active : data.alerts.filter((alert) => alert.status === 'CLEAR')
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-lg font-bold tracking-tight">Alerts</h1><p className="text-[11px] text-muted-foreground">Netdata health checks</p></div><Badge tone={active.length ? 'warning' : 'success'}>{active.length ? `${active.length} active` : 'All clear'}</Badge></div>
    <div className="grid grid-cols-3 rounded-lg border border-line bg-surface p-0.5">{(['active', 'all', 'clear'] as const).map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={cn('rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition', filter === item ? 'bg-accent/[0.09] text-accent' : 'text-muted-foreground')}>{item}{item === 'active' ? ` (${active.length})` : ''}</button>)}</div>
    {visible.length ? <div className="space-y-3">{visible.map((alert) => <AlertCard key={alert.id} alert={alert} />)}</div> : <Card><EmptyState icon={<BellOff size={22}/>} title="No active alerts" description="Your Netdata health checks are clear. New issues will appear here automatically." /></Card>}
  </div>
}

function AlertCard({ alert }: { alert: NetdataAlert }) {
  const tone = alert.status === 'CRITICAL' ? 'danger' : alert.status === 'WARNING' ? 'warning' : 'success'
  const Icon = alert.status === 'CRITICAL' ? CircleAlert : alert.status === 'WARNING' ? TriangleAlert : CheckCircle2
  return <Card className="overflow-hidden"><div className={cn('h-px', tone === 'danger' ? 'bg-danger' : tone === 'warning' ? 'bg-warning' : 'bg-accent')} /><div className="p-3"><div className="flex items-start gap-2.5"><span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone === 'danger' ? 'bg-danger/10 text-danger' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent')}><Icon size={15}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-semibold">{cleanLabel(alert.name)}</p><Badge tone={tone}>{alert.status}</Badge></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{alert.summary}</p></div></div><div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-line pt-2 text-[9px]"><span className="truncate text-muted-foreground">{alert.chart}</span><span className="flex items-center gap-2"><b>{formatValue(alert.value, alert.units)}</b><span className="text-muted-foreground">{timeAgo(alert.updatedAt)}</span></span></div></div></Card>
}
