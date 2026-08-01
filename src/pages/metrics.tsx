import { Activity, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, EmptyState } from '../components/ui'
import type { DashboardData, MetricSeries } from '../lib/types'
import { cleanLabel, cn, formatValue } from '../lib/utils'

interface MetricGroup {
  key: string
  title: string
  context: string
  series: MetricSeries[]
}

export function MetricsPage({ data, openMetric }: { data: DashboardData; openMetric: (series: MetricSeries, targets?: MetricSeries[]) => void }) {
  const [type, setType] = useState('All')
  const groups = useMemo(() => groupMetrics(Object.values(data.series)), [data.series])
  const types = ['All', ...groups.map((group) => group.key)]
  const visible = groups.filter((group) => type === 'All' || group.key === type)

  return <div className="min-w-0 space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-lg font-bold tracking-tight">Metrics</h1><p className="text-[11px] text-muted-foreground">{visible.reduce((count, group) => count + group.series.length, 0)} of {Object.keys(data.series).length} loaded charts · {visible.length} metric types</p></div><label className="relative flex max-w-[52%] items-center"><SlidersHorizontal size={12} className="pointer-events-none absolute left-2 text-muted-foreground"/><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter metric type" className="h-8 min-w-0 max-w-full appearance-none truncate rounded-lg border border-line bg-surface pl-7 pr-2 text-[10px] font-semibold text-foreground outline-none focus:border-accent/40"><option value="All">All types</option>{types.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label></div>

    {visible.length ? <Card className="min-w-0 divide-y divide-line overflow-hidden">{visible.map((group) => <MetricGroupRow key={group.key} group={group} open={() => openMetric(getFirstSeries(group), group.series)} />)}</Card> : <Card><EmptyState icon={<Activity size={20}/>} title="No metrics in this type" description="Choose another metric type to view its targets." /></Card>}
  </div>
}

function groupMetrics(metrics: MetricSeries[]) {
  const groups = new Map<string, MetricGroup>()
  for (const series of metrics) {
    const key = series.definition.context || series.definition.id
    const current = groups.get(key)
    if (current) {
      current.series.push(series)
      continue
    }
    groups.set(key, {
      key,
      title: series.definition.title.replace(/\s*\([^)]*\)\s*$/, ''),
      context: series.definition.context,
      series: [series]
    })
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title))
}

function MetricGroupRow({ group, open }: { group: MetricGroup; open: () => void }) {
  const series = getFirstSeries(group)
  const positive = series.change > 0
  const targetCount = group.series.length
  return <button type="button" onClick={open} className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-accent/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"><span className="grid size-7 place-items-center rounded-md bg-accent/[0.07] text-accent"><Activity size={13}/></span><span className="min-w-0 overflow-hidden"><span className="block truncate text-[11px] font-semibold">{group.title}</span><span className="block truncate text-[9px] text-muted-foreground">{cleanLabel(group.context)} · {targetCount} target{targetCount === 1 ? '' : 's'}</span></span><span className="max-w-24 overflow-hidden text-right"><span className="block truncate text-[11px] font-bold" title={formatValue(series.latest, series.definition.units)}>{formatValue(series.latest, series.definition.units)}</span><span className={cn('block text-[8px]', positive ? 'text-warning' : 'text-accent')}>{positive ? '+' : ''}{series.change.toFixed(1)}%</span></span><ChevronRight size={13} className="text-muted-foreground"/></button>
}

function getFirstSeries(group: MetricGroup) {
  const series = group.series.at(0)
  if (!series) throw new Error(`Metric group ${group.key} is empty`)
  return series
}
