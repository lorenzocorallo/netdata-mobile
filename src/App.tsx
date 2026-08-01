import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from './components/app-shell'
import { MetricDetail } from './components/metric-detail'
import { useSettings } from './hooks/use-settings'
import { buildDemoData } from './lib/demo-data'
import { fetchDashboard } from './lib/netdata-client'
import type { TimeRangeSeconds } from './lib/time-ranges'
import type { MetricSeries, ViewName } from './lib/types'
import { AlertsPage } from './pages/alerts'
import { MetricsPage } from './pages/metrics'
import { OverviewPage } from './pages/overview'
import { SettingsPage } from './pages/settings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } }
})

export default function App() {
  return <QueryClientProvider client={queryClient}><DashboardApp /></QueryClientProvider>
}

function DashboardApp() {
  const { settings, setSettings } = useSettings()
  const cache = useQueryClient()
  const [view, setView] = useState<ViewName>('overview')
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([])
  const [rangeSeconds, setRangeSeconds] = useState<TimeRangeSeconds>(1800)
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', settings.mode, settings.apiBase, rangeSeconds],
    queryFn: ({ signal }) => fetchDashboard(settings, rangeSeconds, signal),
    placeholderData: (previous) => previous,
    refetchInterval: settings.refreshSeconds * 1000
  })
  const data = dashboardQuery.data ?? buildDemoData(rangeSeconds)
  const selectedMetric = selectedMetricIds[0] ? data.series[selectedMetricIds[0]] : null
  const selectedMetricTargets = selectedMetricIds.map((id) => data.series[id]).filter((series): series is MetricSeries => Boolean(series))

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setSelectedMetricIds([])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const criticalCount = data.alerts.filter((alert) => alert.status === 'WARNING' || alert.status === 'CRITICAL').length
  const openMetric = (series: MetricSeries, targets: MetricSeries[] = [series]) => setSelectedMetricIds(targets.map((target) => target.definition.id))
  const changeMetricTarget = (id: string) => setSelectedMetricIds((current) => [id, ...current.filter((targetId) => targetId !== id)])

  return <>
    <AppShell view={view} setView={setView} hostname={data.node.hostname} online={settings.mode === 'demo' || dashboardQuery.isSuccess} alertCount={criticalCount}>
      {settings.mode === 'live' && dashboardQuery.isPending && <div className="mb-3 flex items-center gap-2 rounded-md border border-accent/15 bg-accent/[0.05] px-2 py-1.5 text-[10px] text-accent"><RefreshCw className="animate-spin" size={12}/><span>Connecting to Netdata…</span></div>}
      {dashboardQuery.isError && <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/15 bg-warning/[0.05] px-2 py-1.5 text-[10px] text-warning"><AlertTriangle size={12}/><span className="min-w-0 flex-1 truncate">Connection failed · {dashboardQuery.data ? 'cached values' : 'demo values'}</span><button type="button" className="font-semibold" onClick={() => dashboardQuery.refetch()}>Retry</button></div>}
      {view === 'overview' && <OverviewPage data={data} setView={setView} openMetric={openMetric}/>} 
      {view === 'metrics' && <MetricsPage data={data} openMetric={openMetric}/>} 
      {view === 'alerts' && <AlertsPage data={data}/>} 
      {view === 'settings' && <SettingsPage settings={settings} saveSettings={setSettings} node={data.node} onRefresh={() => cache.invalidateQueries({ queryKey: ['dashboard'] })}/>} 
    </AppShell>
    {selectedMetric && <MetricDetail series={selectedMetric} targets={selectedMetricTargets} onTargetChange={changeMetricTarget} rangeSeconds={rangeSeconds} setRangeSeconds={setRangeSeconds} refreshing={dashboardQuery.isFetching} close={() => setSelectedMetricIds([])}/>}
  </>
}
