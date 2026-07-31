import { Activity, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardData, MetricSeries } from '../lib/types'
import { formatValue } from '../lib/utils'
import { Button, EmptyState, Input } from './ui'

export function SearchOverlay({ data, close, openMetric }: { data: DashboardData; close: () => void; openMetric: (series: MetricSeries) => void }) {
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const results = useMemo(() => Object.values(data.series).filter((series) => `${series.definition.title} ${series.definition.id} ${series.definition.family}`.toLowerCase().includes(query.toLowerCase())), [data.series, query])
  return <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Search metrics"><div className="mx-auto max-w-2xl p-4 pt-[max(1rem,env(safe-area-inset-top))]"><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18}/><Input ref={ref} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search metrics…" className="h-12 pl-11"/></div><Button variant="ghost" size="icon" className="size-12" onClick={close} aria-label="Close search"><X size={20}/></Button></div><p className="mt-5 px-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{query ? `${results.length} results` : 'Available metrics'}</p><div className="mt-2 divide-y divide-white/[0.055]">{results.map((series) => <button key={series.definition.id} onClick={() => { close(); openMetric(series) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/[0.04]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Activity size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{series.definition.title}</span><span className="block truncate text-xs text-muted-foreground">{series.definition.family} · {series.definition.id}</span></span><b className="text-sm">{formatValue(series.latest, series.definition.units)}</b></button>)}</div>{!results.length && <EmptyState icon={<Search size={21}/>} title="Nothing found" description="Try searching by chart name, context, or family." />}</div></div>
}
