import { Activity, Database, Gauge, HardDrive, Layers3, TriangleAlert } from 'lucide-react'
import { Badge, Card, EmptyState } from '../components/ui'
import type { DashboardData, MetricSeries, ZfsDataset, ZfsPool } from '../lib/types'
import { clamp, formatBytes } from '../lib/utils'

export function ZfsPage({ data, openMetric }: { data: DashboardData; openMetric: (series: MetricSeries) => void }) {
  const { zfs } = data
  const mountpoints = new Set(data.zfs.datasets.map((dataset) => dataset.mountpoint))
  const zfsMetrics = Object.values(data.series).filter((series) => series.definition.context.startsWith('zfs.') || series.definition.context.startsWith('zfspool.') || (series.definition.context === 'disk.space' && mountpoints.has(series.definition.family)))
  const free = zfs.pools.reduce((sum, pool) => sum + pool.free, 0)
  const datasetCount = zfs.datasets.filter((dataset) => dataset.type === 'filesystem').length

  return <div className="space-y-4">
    <PageTitle title="ZFS storage" detail={`${data.node.hostname} · live inventory`} />

    {zfs.available ? <>
      <section className="grid grid-cols-3 gap-1.5" aria-label="ZFS summary">
        <MiniStat icon={Database} label="Pools" value={String(zfs.pools.length)} />
        <MiniStat icon={Layers3} label="Datasets" value={String(datasetCount)} />
        <MiniStat icon={HardDrive} label="Free" value={formatBytes(free)} />
      </section>

      <section className="space-y-2">
        {zfs.pools.map((pool) => <PoolCard key={pool.name} pool={pool} datasets={zfs.datasets.filter((dataset) => dataset.pool === pool.name)} />)}
      </section>
    </> : <Card><EmptyState icon={<TriangleAlert size={20}/>} title="ZFS inventory unavailable" description={zfs.error || 'The bundled service could not run zpool and zfs list on this host.'} /></Card>}

    {zfsMetrics.length > 0 && <section>
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">ZFS metrics</h2><span className="text-[10px] text-muted-foreground">{zfsMetrics.length} charts</span></div>
      <Card className="divide-y divide-line overflow-hidden">{zfsMetrics.map((series) => <button type="button" key={series.definition.id} onClick={() => openMetric(series)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/[0.035]"><span className="flex min-w-0 items-center gap-2"><Activity size={14} className="shrink-0 text-accent"/><span className="min-w-0"><span className="block truncate text-xs font-semibold">{series.definition.title}</span><span className="block truncate text-[10px] text-muted-foreground">{series.definition.context}</span></span></span><span className="text-[10px] text-muted-foreground">Open</span></button>)}</Card>
    </section>}

    {zfs.available && <p className="text-[10px] leading-relaxed text-muted-foreground">Pool totals are physical aggregate capacity. Dataset values include each dataset’s effective quota and available space; parent usage includes its descendants.</p>}
  </div>
}

function PageTitle({ title, detail }: { title: string; detail: string }) {
  return <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-lg font-bold tracking-tight">{title}</h1><p className="truncate text-[11px] text-muted-foreground">{detail}</p></div><Database size={18} className="shrink-0 text-accent"/></div>
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return <Card className="min-w-0 p-2.5"><Icon size={13} className="text-accent"/><p className="mt-2 truncate text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-bold" title={value}>{value}</p></Card>
}

function PoolCard({ pool, datasets }: { pool: ZfsPool; datasets: ZfsDataset[] }) {
  const percent = pool.size ? clamp((pool.allocated / pool.size) * 100) : pool.capacity
  const healthy = pool.health.toUpperCase() === 'ONLINE'
  return <Card className="overflow-hidden">
    <div className="px-3 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-bold">{pool.name}</h2><Badge tone={healthy ? 'success' : 'danger'}>{pool.health}</Badge></div><p className="mt-1 text-[10px] text-muted-foreground">{formatBytes(pool.allocated)} used of {formatBytes(pool.size)}</p></div><div className="text-right"><p className="text-sm font-bold text-accent">{formatBytes(pool.free)}</p><p className="text-[9px] text-muted-foreground">remaining</p></div></div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }}/></div>
      <div className="mt-2 flex gap-3 text-[9px] text-muted-foreground"><span>{percent.toFixed(1)}% used</span><span>{pool.fragmentation === null ? '—' : `${pool.fragmentation}%`} fragmented</span><span>{datasets.length} dataset{datasets.length === 1 ? '' : 's'}</span></div>
    </div>
    <div className="border-t border-line bg-black/10">
      {datasets.map((dataset) => <DatasetRow key={dataset.name} dataset={dataset} />)}
    </div>
  </Card>
}

function DatasetRow({ dataset }: { dataset: ZfsDataset }) {
  const effectiveSize = dataset.quota && dataset.quota > 0 ? dataset.quota : dataset.used + dataset.available
  const percent = effectiveSize > 0 ? clamp((dataset.used / effectiveSize) * 100) : 0
  const isRoot = dataset.depth === 0
  return <div className="border-b border-line px-3 py-2.5 last:border-b-0">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="min-w-0" style={{ paddingLeft: `${Math.min(dataset.depth, 3) * 10}px` }}><div className="flex min-w-0 items-center gap-1.5">{isRoot ? <Gauge size={12} className="shrink-0 text-accent"/> : <i className="size-1 shrink-0 rounded-full bg-[#365942]"/>}<p className="truncate text-[11px] font-semibold" title={dataset.name}>{dataset.name}</p>{isRoot && <span className="shrink-0 text-[8px] uppercase tracking-wider text-muted-foreground">aggregate</span>}</div><p className="mt-0.5 truncate text-[9px] text-muted-foreground" title={dataset.mountpoint}>{dataset.mountpoint === '-' ? dataset.type : dataset.mountpoint}{dataset.quota ? ` · ${formatBytes(dataset.quota)} quota` : ''}</p></div>
      <div className="text-right"><p className="text-[11px] font-bold">{formatBytes(dataset.available)}</p><p className="text-[8px] text-muted-foreground">free</p></div>
    </div>
    <div className="mt-1.5 ml-auto h-0.5 overflow-hidden rounded-full bg-white/[0.05]" style={{ width: `calc(100% - ${Math.min(dataset.depth, 3) * 10}px)` }}><div className="h-full bg-[#477a57]" style={{ width: `${percent}%` }}/></div>
  </div>
}
