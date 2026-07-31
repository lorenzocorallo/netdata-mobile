import { Check, CircleHelp, Database, Download, ExternalLink, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, Input } from '../components/ui'
import { testConnection } from '../lib/netdata-client'
import type { AppSettings, NodeInfo } from '../lib/types'

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
    await (installPrompt as Event & { prompt: () => Promise<void> }).prompt()
    setInstallPrompt(null)
  }

  return <div className="space-y-3">
    <div><h1 className="text-lg font-bold tracking-tight">Settings</h1><p className="text-[11px] text-muted-foreground">Connection and refresh preferences</p></div>

    <Card className="p-3"><SectionHeading icon={Database} title="Data source" detail="Bundled service uses /netdata" />
      <div className="mt-3 grid grid-cols-2 rounded-lg border border-line bg-black/15 p-0.5"><button type="button" onClick={() => setDraft({ ...draft, mode: 'demo' })} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${draft.mode === 'demo' ? 'bg-accent/[0.09] text-accent' : 'text-muted-foreground'}`}>Demo data</button><button type="button" onClick={() => setDraft({ ...draft, mode: 'live' })} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${draft.mode === 'live' ? 'bg-accent/[0.09] text-accent' : 'text-muted-foreground'}`}>Live agent</button></div>
      <label htmlFor="api-base" className="mt-3 block"><span className="mb-1 block text-[10px] font-semibold">API base path</span><Input id="api-base" value={draft.apiBase} onChange={(event) => { setDraft({ ...draft, apiBase: event.target.value }); setTestState('idle') }} placeholder="/netdata" spellCheck={false}/></label>
      <div className="mt-2.5 flex gap-1.5"><Button variant="secondary" onClick={runTest} disabled={testState === 'testing'}><Wifi size={13}/>{testState === 'testing' ? 'Testing…' : 'Test'}</Button><Button onClick={() => { saveSettings(draft); onRefresh() }}><Check size={13}/>Save</Button></div>
      {testState !== 'idle' && testState !== 'testing' && <div className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] ${testState === 'ok' ? 'bg-accent/[0.08] text-accent' : 'bg-danger/10 text-danger'}`}>{testState === 'ok' ? <Wifi size={12}/> : <WifiOff size={12}/>}<span className="truncate">{testMessage}</span></div>}
    </Card>

    <Card className="p-3"><SectionHeading icon={RefreshCw} title="Refresh" detail={`${draft.refreshSeconds} second interval`} /><div className="mt-3 grid grid-cols-4 gap-1">{[5, 10, 30, 60].map((seconds) => <button type="button" key={seconds} onClick={() => setDraft({ ...draft, refreshSeconds: seconds })} className={`rounded-md border py-1.5 text-[10px] font-semibold transition ${draft.refreshSeconds === seconds ? 'border-accent/35 bg-accent/[0.08] text-accent' : 'border-line text-muted-foreground'}`}>{seconds}s</button>)}</div></Card>

    <Card className="p-3"><div className="flex items-center justify-between gap-2"><SectionHeading icon={Server} title={node.hostname} detail={`${node.os} · ${node.kernel || 'kernel unknown'}`} /><Badge tone={settings.mode === 'demo' ? 'neutral' : 'success'}>{settings.mode}</Badge></div></Card>

    <Card className="p-3"><SectionHeading icon={Download} title="Install app" detail="Add Netdata Mobile to your home screen"/><Button className="mt-3 w-full" variant="secondary" disabled={!installPrompt} onClick={installApp}>{installPrompt ? 'Install app' : 'Use “Add to Home Screen”'}<ExternalLink size={12}/></Button></Card>
    <div className="flex items-start gap-1.5 px-1 text-[9px] leading-relaxed text-muted-foreground"><CircleHelp size={12} className="mt-0.5 shrink-0"/><p>Keep port 19998 limited to your LAN or WireGuard network. API requests stay on the host.</p></div>
  </div>
}

function SectionHeading({ icon: Icon, title, detail }: { icon: typeof Database; title: string; detail: string }) {
  return <div className="flex min-w-0 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent/[0.07] text-accent"><Icon size={13}/></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{title}</p><p className="truncate text-[9px] text-muted-foreground">{detail}</p></div></div>
}
