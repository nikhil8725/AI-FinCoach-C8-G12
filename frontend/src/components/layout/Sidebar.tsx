import { Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { sidebarOrder, navItems } from './navConfig'

interface SidebarProps {
  agentStatus: 'idle' | 'running' | 'done'
}

const statusLabel: Record<SidebarProps['agentStatus'], string> = {
  idle: 'Idle',
  running: 'Running',
  done: 'Up to date',
}

const statusColor: Record<SidebarProps['agentStatus'], string> = {
  idle: '#9CA3AF',
  running: '#FF6B35',
  done: '#10B981',
}

export function Sidebar({ agentStatus }: SidebarProps) {
  const color = statusColor[agentStatus]

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 p-5 lg:flex">
      <div className="flex flex-1 flex-col rounded-card-lg bg-surface p-6 shadow-card">
        <div className="flex items-center gap-2.5 px-2.5 pb-5 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light shadow-[0_4px_12px_rgba(255,107,53,0.35)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12c3-8 15-8 18 0-3 8-15 8-18 0Z" />
              <circle cx="12" cy="12" r="2.4" />
            </svg>
          </div>
          <div className="text-[19px] font-bold tracking-tight">FinCoach</div>
        </div>

        <nav className="flex flex-col gap-1">
          {sidebarOrder.map((key) => {
            const item = navItems[key]
            const Icon = item.icon
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-bg'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl border border-border-subtle bg-bg px-3.5 py-3">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 0 4px ${color}30` }}
            />
            <div className="text-[12.5px] font-semibold text-ink-soft">Agents: {statusLabel[agentStatus]}</div>
            <button className="ml-auto flex text-ink-faint hover:text-ink-soft" type="button" aria-label="Settings">
              <Settings size={17} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
