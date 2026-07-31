import { Activity, Bell, Gauge, Menu, Moon, Search, Settings, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ViewName } from '../lib/types'
import { cn } from '../lib/utils'
import { Button } from './ui'

const navItems: Array<{ id: ViewName; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function AppShell({ view, setView, children, hostname, online, alertCount, dark, setDark, onSearch }: {
  view: ViewName
  setView: (view: ViewName) => void
  children: ReactNode
  hostname: string
  online: boolean
  alertCount: number
  dark: boolean
  setDark: (dark: boolean) => void
  onSearch: () => void
}) {
  return <div className="min-h-dvh bg-background text-foreground selection:bg-accent/25">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.07] bg-[#0a0d0c]/95 px-4 py-6 backdrop-blur xl:block">
      <Logo />
      <nav className="mt-10 space-y-1.5" aria-label="Primary navigation">
        {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} alertCount={alertCount} />)}
      </nav>
      <div className="absolute inset-x-4 bottom-6 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
        <div className="flex items-center gap-3">
          <span className="relative grid size-9 place-items-center rounded-xl bg-accent/10 text-accent"><Activity size={18} /><i className={cn('absolute right-0 top-0 size-2.5 rounded-full border-2 border-card', online ? 'bg-accent' : 'bg-danger')} /></span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{hostname}</p><p className="text-xs text-muted-foreground">{online ? 'Agent connected' : 'Connection issue'}</p></div>
        </div>
      </div>
    </aside>

    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl xl:ml-64 xl:px-8 xl:py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 xl:hidden"><Logo compact /><div className="h-5 w-px bg-white/10" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{hostname}</p><p className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><i className={cn('size-1.5 rounded-full', online ? 'bg-accent' : 'bg-danger')} />{online ? 'Live' : 'Offline'}</p></div></div>
        <div className="hidden xl:block"><p className="text-sm font-semibold">{hostname}</p><p className="text-xs text-muted-foreground">Your infrastructure at a glance</p></div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search metrics" onClick={onSearch}><Search size={18} /></Button>
          <Button variant="ghost" size="icon" aria-label={dark ? 'Use light appearance' : 'Use dark appearance'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</Button>
          <Button variant="ghost" size="icon" className="hidden xl:inline-flex" aria-label="Menu"><Menu size={18} /></Button>
        </div>
      </div>
    </header>

    <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] xl:ml-64 xl:pb-10"><div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 xl:px-8 xl:py-8">{children}</div></main>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#0b0e0d]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden" aria-label="Primary navigation">
      <div className="grid grid-cols-4 px-2 py-1.5">{navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} alertCount={alertCount} mobile />)}</div>
    </nav>
  </div>
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className={cn('grid place-items-center rounded-xl bg-accent text-[#081009] shadow-[0_0_28px_rgba(116,217,139,.15)]', compact ? 'size-8' : 'size-10')}><Activity size={compact ? 18 : 22} strokeWidth={2.5} /></span>{!compact && <div><p className="text-base font-bold tracking-tight">Netdata Mobile</p><p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Proxmox companion</p></div>}</div>
}

function NavButton({ item, active, onClick, alertCount, mobile = false }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void; alertCount: number; mobile?: boolean }) {
  const Icon = item.icon
  return <button onClick={onClick} aria-current={active ? 'page' : undefined} className={cn('relative flex transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50', mobile ? 'min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium' : 'w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', active ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground')}>
    <Icon size={mobile ? 20 : 18} strokeWidth={active ? 2.3 : 1.8} />{item.label}
    {item.id === 'alerts' && alertCount > 0 && <span className={cn('grid place-items-center rounded-full bg-danger text-[9px] font-bold text-white', mobile ? 'absolute right-[calc(50%-19px)] top-1.5 size-4' : 'ml-auto size-5')}>{alertCount}</span>}
  </button>
}
