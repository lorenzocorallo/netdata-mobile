import { Activity, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, EmptyState } from '../components/ui'
import type { DashboardData, MetricSeries } from '../lib/types'
import { cleanLabel, cn, formatValue } from '../lib/utils'

export function MetricsPage({ data, openMetric }: { data: DashboardData; openMetric: (series: MetricSeries) => void }) {
  const [family, setFamily] = useState('All')
  const metrics = Object.values(data.series)
  const families = ['All', ...new Set(metrics.map((series) => series.definition.family))]
  const visible = useMemo(() => metrics.filter((series) => family === 'All' || series.definition.family === family), [family, metrics])

  return <div className="min-w-0 space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-lg font-bold tracking-tight">Metrics</h1><p className="text-[11px] text-muted-foreground">{visible.length} of {metrics.length} loaded charts</p></div><label className="relative flex max-w-[52%] items-center"><SlidersHorizontal size={12} className="pointer-events-none absolute left-2 text-muted-foreground"/><select value={family} onChange={(event) => setFamily(event.target.value)} aria-label="Filter metric family" className="h-8 min-w-0 max-w-full appearance-none truncate rounded-lg border border-line bg-surface pl-7 pr-2 text-[10px] font-semibold text-foreground outline-none focus:border-accent/40">{families.map((item) => <option key={item}>{item}</option>)}</select></label></div>

    {visible.length ? <Card className="min-w-0 divide-y divide-line overflow-hidden">{visible.map((series) => <MetricRow key={series.definition.id} series={series} open={() => openMetric(series)} />)}</Card> : <Card><EmptyState icon={<Activity size={20}/>} title="No metrics in this family" description="Choose another family to view its charts." /></Card>}
  </div>
}

function MetricRow({ series, open }: { series: MetricSeries; open: () => void }) {
  return <button type="button" onClick={open} className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-accent/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"><span className="grid size-7 place-items-center rounded-md bg-accent/[0.07] text-accent"><Activity size={13}/></span><span className="min-w-0 overflow-hidden"><span className="block truncate text-[11px] font-semibold">{series.definition.title}</span><span className="block truncate text-[9px] text-muted-foreground">{cleanLabel(series.definition.family)} · {series.definition.dimensions.length} dim</span></span><span className="max-w-24 overflow-hidden text-right"><span className="block truncate text-[11px] font-bold" title={formatValue(series.latest, series.definition.units)}>{formatValue(series.latest, series.definition.units)}</span><span className={cn('block text-[8px]', series.change > 0 ? 'text-warning' : 'text-accent')}>{series.change > 0 ? '+' : ''}{series.change.toFixed(1)}%</span></span><ChevronRight size={13} className="text-muted-foreground"/></button>
}
