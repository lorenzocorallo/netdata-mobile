import { Activity, ChevronRight, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DashboardData, MetricSeries } from '../lib/types'
import { cleanLabel, cn, formatValue } from '../lib/utils'
import { Badge, Card, EmptyState, Input } from '../components/ui'

export function MetricsPage({ data, openMetric }: { data: DashboardData; openMetric: (series: MetricSeries) => void }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('All')
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('netdata-mobile.favorites') ?? '[]') as string[])
  const metrics = Object.values(data.series)
  const families = ['All', ...new Set(metrics.map((series) => series.definition.family))]
  const visible = useMemo(() => metrics.filter((series) => {
    const haystack = `${series.definition.title} ${series.definition.id} ${series.definition.family}`.toLowerCase()
    return (family === 'All' || series.definition.family === family) && haystack.includes(query.toLowerCase())
  }).sort((a, b) => Number(favorites.includes(b.definition.id)) - Number(favorites.includes(a.definition.id))), [family, favorites, metrics, query])

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id]
    setFavorites(next)
    localStorage.setItem('netdata-mobile.favorites', JSON.stringify(next))
  }

  return <div className="space-y-5">
    <div><p className="eyebrow">Explore</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Metrics</h1><p className="mt-1 text-sm text-muted-foreground">The signals that matter most on this host.</p></div>
    <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17}/><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Search metrics, charts or families…" aria-label="Search metrics" /></div>
    <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">{families.map((item) => <button key={item} onClick={() => setFamily(item)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition', family === item ? 'border-accent/35 bg-accent/12 text-accent' : 'border-white/[0.07] bg-white/[0.03] text-muted-foreground')}>{item}</button>)}</div>
    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{visible.length} charts</p><Badge>{data.metrics.length} discovered</Badge></div>
    {visible.length ? <div className="grid gap-2 md:grid-cols-2">{visible.map((series) => <Card key={series.definition.id} className="flex items-center gap-2 p-2.5 transition hover:border-accent/20"><button onClick={() => toggleFavorite(series.definition.id)} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-white/[0.04] hover:text-warning" aria-label={`${favorites.includes(series.definition.id) ? 'Remove' : 'Add'} ${series.definition.title} ${favorites.includes(series.definition.id) ? 'from' : 'to'} favorites`}><Star size={17} className={favorites.includes(series.definition.id) ? 'fill-warning text-warning' : ''}/></button><button onClick={() => openMetric(series)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/[0.08] text-accent"><Activity size={18}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{series.definition.title}</span><span className="block truncate text-[11px] text-muted-foreground">{cleanLabel(series.definition.family)} · {series.definition.dimensions.length} dimension{series.definition.dimensions.length === 1 ? '' : 's'}</span></span><span className="text-right"><span className="block text-sm font-bold">{formatValue(series.latest, series.definition.units)}</span><span className={cn('block text-[10px]', series.change > 0 ? 'text-warning' : 'text-accent')}>{series.change > 0 ? '+' : ''}{series.change.toFixed(1)}%</span></span><ChevronRight size={16} className="shrink-0 text-muted-foreground"/></button></Card>)}</div> : <Card><EmptyState icon={<Search size={21}/>} title="No matching metrics" description="Try a different search term or choose another family." /></Card>}
  </div>
}
