import { Activity, Bell, Gauge, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ViewName } from '../lib/types'
import { cn } from '../lib/utils'

const navItems: Array<{ id: ViewName; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Home', icon: Gauge },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function AppShell({ view, setView, children, hostname, online, alertCount }: {
  view: ViewName
  setView: (view: ViewName) => void
  children: ReactNode
  hostname: string
  online: boolean
  alertCount: number
}) {
  return <div className="min-h-dvh bg-background text-foreground selection:bg-accent/25">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-line bg-surface px-3 py-5 xl:block">
      <Logo />
      <nav className="mt-8 space-y-1" aria-label="Primary navigation">
        {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} alertCount={alertCount} />)}
      </nav>
      <div className="absolute inset-x-3 bottom-4 flex items-center gap-2.5 border-t border-line pt-4">
        <i className={cn('size-2 rounded-full', online ? 'bg-accent' : 'bg-danger')} />
        <div className="min-w-0"><p className="truncate text-xs font-semibold">{hostname}</p><p className="text-[10px] text-muted-foreground">{online ? 'Agent connected' : 'Connection issue'}</p></div>
      </div>
    </aside>

    <main className="pb-[calc(3.65rem+env(safe-area-inset-bottom))] xl:ml-56 xl:pb-8">
      <div className="mx-auto max-w-6xl px-3 pb-4 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-5 xl:px-7 xl:pt-6">{children}</div>
    </main>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#070c09]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden" aria-label="Primary navigation">
      <div className="grid h-13 grid-cols-5 px-1">{navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} alertCount={alertCount} mobile />)}</div>
    </nav>
  </div>
}

function Logo() {
  return <div className="flex items-center gap-2.5 px-2"><span className="grid size-8 place-items-center rounded-lg bg-accent text-[#061008]"><Activity size={18} strokeWidth={2.5} /></span><div><p className="text-sm font-bold tracking-tight">Netdata Mobile</p><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Proxmox</p></div></div>
}

function NavButton({ item, active, onClick, alertCount, mobile = false }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void; alertCount: number; mobile?: boolean }) {
  const Icon = item.icon
  return <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cn('relative flex transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent', mobile ? 'min-w-0 flex-col items-center justify-center gap-0.5 text-[9px] font-medium' : 'w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium', active ? 'text-accent' : 'text-muted-foreground hover:text-foreground', !mobile && active && 'bg-accent/[0.08]')}>
    {mobile && active && <i className="absolute inset-x-3 top-0 h-px bg-accent" />}
    <Icon size={mobile ? 17 : 16} strokeWidth={active ? 2.3 : 1.8} />
    <span className="truncate">{item.label}</span>
    {item.id === 'alerts' && alertCount > 0 && <span className={cn('grid place-items-center rounded-full bg-danger text-[8px] font-bold text-white', mobile ? 'absolute right-[calc(50%-17px)] top-1 size-3.5' : 'ml-auto size-4')}>{alertCount}</span>}
  </button>
}
