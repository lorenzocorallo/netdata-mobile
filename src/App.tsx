import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from './components/app-shell'
import { MetricDetail } from './components/metric-detail'
import { SearchOverlay } from './components/search-overlay'
import { useSettings } from './hooks/use-settings'
import { buildDemoData } from './lib/demo-data'
import { fetchDashboard } from './lib/netdata-client'
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
  const [selectedMetric, setSelectedMetric] = useState<MetricSeries | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('netdata-mobile.appearance') !== 'light')
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', settings.mode, settings.apiBase],
    queryFn: ({ signal }) => fetchDashboard(settings, 1800, signal),
    refetchInterval: settings.refreshSeconds * 1000
  })
  const data = dashboardQuery.data ?? buildDemoData()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('netdata-mobile.appearance', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedMetric(null); setSearchOpen(false) }
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const criticalCount = data.alerts.filter((alert) => alert.status === 'WARNING' || alert.status === 'CRITICAL').length
  const openMetric = (series: MetricSeries) => setSelectedMetric(series)

  return <>
    <AppShell view={view} setView={setView} hostname={data.node.hostname} online={settings.mode === 'demo' || dashboardQuery.isSuccess} alertCount={criticalCount} dark={dark} setDark={setDark} onSearch={() => setSearchOpen(true)}>
      {settings.mode === 'live' && dashboardQuery.isPending && <div className="mb-5 flex items-center gap-3 rounded-xl border border-accent/15 bg-accent/[0.07] p-3 text-xs text-accent"><RefreshCw className="animate-spin" size={16}/><span>Connecting to your Netdata agent…</span></div>}
      {dashboardQuery.isError && <div className="mb-5 flex items-center gap-3 rounded-xl border border-warning/15 bg-warning/[0.07] p-3 text-xs text-warning"><AlertTriangle size={16}/><span className="flex-1">Live connection failed. {dashboardQuery.data ? 'Showing the last successful values.' : 'Demo values are shown until the agent is reachable.'}</span><button className="font-semibold underline" onClick={() => dashboardQuery.refetch()}>Retry</button></div>}
      {view === 'overview' && <OverviewPage data={data} setView={setView} openMetric={openMetric}/>} 
      {view === 'metrics' && <MetricsPage data={data} openMetric={openMetric}/>} 
      {view === 'alerts' && <AlertsPage data={data}/>} 
      {view === 'settings' && <SettingsPage settings={settings} saveSettings={setSettings} node={data.node} onRefresh={() => cache.invalidateQueries({ queryKey: ['dashboard'] })}/>} 
    </AppShell>
    {selectedMetric && <MetricDetail series={selectedMetric} close={() => setSelectedMetric(null)}/>} 
    {searchOpen && <SearchOverlay data={data} close={() => setSearchOpen(false)} openMetric={openMetric}/>} 
  </>
}
