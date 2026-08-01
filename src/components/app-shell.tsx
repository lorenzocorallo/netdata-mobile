import { Activity, Bell, Gauge, Settings } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
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
  const [compactNav, setCompactNav] = useState(false)

  useEffect(() => {
    let previousY = window.scrollY
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - previousY
      if (currentY <= 12 || delta < -6) setCompactNav(false)
      else if (delta > 4) setCompactNav(true)
      previousY = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

    <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] xl:ml-56 xl:pb-8">
      <div className="mx-auto max-w-6xl px-3 pb-4 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-5 xl:px-7 xl:pt-6">{children}</div>
    </main>

    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] xl:hidden" aria-label="Primary navigation" data-compact={compactNav ? 'true' : 'false'}>
      <div className={cn('pointer-events-auto mx-auto flex w-fit items-center rounded-full border border-white/15 bg-[#151718]/80 shadow-[0_10px_34px_rgba(0,0,0,.42)] backdrop-blur-2xl transition-[margin,padding,gap] duration-300', compactNav ? 'mb-2 gap-0.5 px-1.5 py-1.5' : 'mb-3 gap-1 px-2 py-2')}>
        {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} alertCount={alertCount} mobile compact={compactNav} />)}
      </div>
    </nav>
  </div>
}

function Logo() {
  return <div className="flex items-center gap-2.5 px-2"><span className="grid size-8 place-items-center rounded-lg bg-accent text-[#0b0d0c]"><Activity size={18} strokeWidth={2.5} /></span><div><p className="text-sm font-bold tracking-tight">Netdata Mobile</p><p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Proxmox</p></div></div>
}

function NavButton({ item, active, onClick, alertCount, mobile = false, compact = false }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void; alertCount: number; mobile?: boolean; compact?: boolean }) {
  const Icon = item.icon
  return <button type="button" onClick={onClick} aria-label={item.label} aria-current={active ? 'page' : undefined} className={cn('relative flex transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent', mobile ? compact ? 'size-8 items-center justify-center rounded-full' : 'size-10 items-center justify-center rounded-full' : 'w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium', active ? 'text-accent' : 'text-muted-foreground hover:text-foreground', mobile && active && 'bg-white/[0.11] text-foreground', !mobile && active && 'bg-accent/[0.08]')}>
    <Icon size={mobile ? 17 : 16} strokeWidth={active ? 2.3 : 1.8} />
    <span className={cn('truncate', mobile && 'sr-only')}>{item.label}</span>
    {item.id === 'alerts' && alertCount > 0 && <span className={cn('grid place-items-center rounded-full bg-danger text-[8px] font-bold text-white', mobile ? 'absolute right-0.5 top-0.5 size-3.5' : 'ml-auto size-4')}>{alertCount}</span>}
  </button>
}
