import { Activity, ArrowDownRight, ArrowUpRight, Clock, X } from 'lucide-react'
import type { MetricSeries } from '../lib/types'
import { cleanLabel, cn, formatValue } from '../lib/utils'
import { MetricChart } from './metric-chart'
import { Badge, Button } from './ui'

export function MetricDetail({ series, close }: { series: MetricSeries; close: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="metric-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-white/[0.09] bg-[#111513] shadow-2xl sm:max-w-2xl sm:rounded-[1.75rem]">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[0.06] bg-[#111513]/95 p-4 backdrop-blur"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Activity size={19}/></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{series.definition.family}</p><h2 id="metric-title" className="truncate font-semibold">{series.definition.title}</h2></div></div><Button variant="ghost" size="icon" onClick={close} aria-label="Close metric details"><X size={19}/></Button></div>
      <div className="p-4 sm:p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-3xl font-bold tracking-tight">{formatValue(series.latest, series.definition.units)}</p><p className={cn('mt-1 flex items-center gap-1 text-xs font-semibold', series.change > 0 ? 'text-warning' : 'text-accent')}>{series.change > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {Math.abs(series.change).toFixed(1)}% over the last samples</p></div><Badge>{cleanLabel(series.definition.context)}</Badge></div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.035] px-3 py-2.5 text-xs"><span className="flex items-center gap-1.5 font-semibold"><Clock size={14} className="text-accent"/>Last 30 minutes</span><span className="text-muted-foreground">60 points</span></div>
        <div className="mt-4 rounded-2xl border border-white/[0.055] bg-black/10 p-2"><MetricChart points={series.points} units={series.definition.units} height={230} label={series.definition.title}/></div>
        <div className="mt-4 flex flex-wrap gap-3">{series.definition.dimensions.slice(0, 6).map((dimension, index) => <span key={dimension} className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="size-2 rounded-full" style={{ background: `var(--ts-chart-${(index % 6) + 1})` }}/>{dimension}</span>)}</div>
        <div className="mt-5 grid grid-cols-3 gap-2">{[['Minimum', series.min], ['Current', series.latest], ['Maximum', series.max]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white/[0.035] p-3 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{String(label)}</p><p className="mt-1 text-sm font-bold">{formatValue(Number(value), series.definition.units)}</p></div>)}</div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock size={13}/>Collected from <code>{series.definition.id}</code></p>
      </div>
    </div>
  </div>
}
