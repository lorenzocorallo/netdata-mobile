import { Check, CircleHelp, Database, Download, ExternalLink, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppSettings, NodeInfo } from '../lib/types'
import { testConnection } from '../lib/netdata-client'
import { Badge, Button, Card, Input, Switch } from '../components/ui'

export function SettingsPage({ settings, saveSettings, node, onRefresh }: { settings: AppSettings; saveSettings: (settings: AppSettings) => void; node: NodeInfo; onRefresh: () => void }) {
  const [draft, setDraft] = useState(settings)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function runTest() {
    setTestState('testing')
    try { const hostname = await testConnection(draft.apiBase); setTestMessage(`Connected to ${hostname}`); setTestState('ok') }
    catch (error) { setTestMessage(error instanceof Error ? error.message : 'Connection failed'); setTestState('error') }
  }

  async function installApp() {
    if (!installPrompt) return
    const event = installPrompt as Event & { prompt: () => Promise<void> }
    await event.prompt()
    setInstallPrompt(null)
  }

  return <div className="space-y-5">
    <div><p className="eyebrow">Configure</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Connect the app and tune its refresh behavior.</p></div>
    <Card className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent"><Database size={19}/></span><div><p className="font-semibold">Data source</p><p className="text-xs text-muted-foreground">Demo or your live Netdata agent</p></div></div><Switch checked={draft.mode === 'live'} onChange={(live) => setDraft({ ...draft, mode: live ? 'live' : 'demo' })} label="Use live Netdata agent" /></div>
      <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/15 p-1"><div className="grid grid-cols-2 gap-1"><button onClick={() => setDraft({ ...draft, mode: 'demo' })} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${draft.mode === 'demo' ? 'bg-white/[0.08]' : 'text-muted-foreground'}`}>Demo data</button><button onClick={() => setDraft({ ...draft, mode: 'live' })} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${draft.mode === 'live' ? 'bg-white/[0.08]' : 'text-muted-foreground'}`}>Live agent</button></div></div>
      <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold">API base path</span><Input value={draft.apiBase} onChange={(event) => { setDraft({ ...draft, apiBase: event.target.value }); setTestState('idle') }} placeholder="/netdata" spellCheck={false}/><span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground">Keep <code>/netdata</code> when using the bundled systemd service, or enter a full agent URL when CORS is enabled.</span></label>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={runTest} disabled={testState === 'testing'}><Wifi size={16} />{testState === 'testing' ? 'Testing…' : 'Test connection'}</Button><Button onClick={() => { saveSettings(draft); onRefresh() }}><Check size={16}/>Save changes</Button></div>
      {testState !== 'idle' && testState !== 'testing' && <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${testState === 'ok' ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>{testState === 'ok' ? <Wifi size={15}/> : <WifiOff size={15}/>}<span>{testMessage}</span></div>}
    </Card>

    <Card className="p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground"><RefreshCw size={18}/></span><div><p className="font-semibold">Refresh interval</p><p className="text-xs text-muted-foreground">How often new values are requested</p></div></div><div className="mt-4 grid grid-cols-4 gap-2">{[5, 10, 30, 60].map((seconds) => <button key={seconds} onClick={() => setDraft({ ...draft, refreshSeconds: seconds })} className={`rounded-xl border py-2.5 text-xs font-semibold transition ${draft.refreshSeconds === seconds ? 'border-accent/35 bg-accent/10 text-accent' : 'border-white/[0.07] text-muted-foreground'}`}>{seconds}s</button>)}</div></Card>

    <Card className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground"><Server size={18}/></span><div><p className="font-semibold">Current node</p><p className="text-xs text-muted-foreground">{node.hostname} · {node.version}</p></div></div><Badge tone={settings.mode === 'demo' ? 'neutral' : 'success'}>{settings.mode}</Badge></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white/[0.035] p-3"><dt className="text-muted-foreground">Operating system</dt><dd className="mt-1 truncate font-semibold">{node.os}</dd></div><div className="rounded-xl bg-white/[0.035] p-3"><dt className="text-muted-foreground">Kernel</dt><dd className="mt-1 truncate font-semibold">{node.kernel || '—'}</dd></div></dl></Card>

    <Card className="p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent"><Download size={18}/></span><div className="min-w-0 flex-1"><p className="font-semibold">Install Netdata Mobile</p><p className="text-xs text-muted-foreground">Add it to your home screen for an app-like experience.</p></div></div><Button className="mt-4 w-full" variant="secondary" disabled={!installPrompt} onClick={installApp}>{installPrompt ? 'Install app' : 'Use your browser’s “Add to Home Screen”'}<ExternalLink size={15}/></Button></Card>
    <div className="flex items-start gap-2 rounded-xl px-2 text-xs leading-relaxed text-muted-foreground"><CircleHelp size={16} className="mt-0.5 shrink-0"/><p>Keep port 19999 limited to your trusted LAN or WireGuard network. The bundled service forwards API requests to the local Netdata agent.</p></div>
  </div>
}
