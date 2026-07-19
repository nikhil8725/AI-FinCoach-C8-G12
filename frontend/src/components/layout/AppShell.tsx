import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { MoreSheet } from './MoreSheet'
import { Header } from './Header'
import { useApi } from '../../hooks/useApi'
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen'
import { api } from '../../lib/api'

interface PageMeta {
  title: string
  subtitle: string
}

interface AnalyzeLatest {
  status: string | null
  health_score: number | null
  has_documents: boolean
}

const pageMeta: Record<string, PageMeta> = {
  '/onboarding': { title: 'FinCoach AI', subtitle: 'Multi-agent financial coach' },
  '/orchestration': { title: 'Agent Orchestration', subtitle: 'Four specialists working in parallel on your documents' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Your complete financial picture' },
  '/debt': { title: 'Debt Planner', subtitle: 'Simulate avalanche vs. snowball payoff strategies' },
  '/savings': { title: 'Savings', subtitle: 'Emergency fund and goal planning' },
  '/budget': { title: 'Budget', subtitle: '50/30/20 analysis and category caps' },
  '/chat': { title: 'Coach Chat', subtitle: 'Ask anything about your finances' },
  '/documents': { title: 'Documents', subtitle: 'Everything your agents have read' },
}

const NO_HEADER_ACTIONS = new Set(['/onboarding', '/orchestration'])

export function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const keyboardOpen = useKeyboardOpen()

  const { data: latest } = useApi<AnalyzeLatest>(() => api.get('/analyze/latest'), [location.pathname])

  const meta = pageMeta[location.pathname] ?? { title: 'FinCoach', subtitle: '' }
  const showHeaderActions = !NO_HEADER_ACTIONS.has(location.pathname)
  const agentStatus = latest?.status === 'running' ? 'running' : latest?.status === 'complete' ? 'done' : 'idle'
  const showTabBar = !keyboardOpen

  const handleRerun = () => navigate('/orchestration', { state: { autostart: true } })

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <Sidebar agentStatus={agentStatus} />

      <main className={`flex min-w-0 flex-1 flex-col px-4 pt-2 sm:px-6 lg:pb-10 lg:pl-1 ${showTabBar ? 'pb-24' : 'pb-4'}`}>
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          healthScore={showHeaderActions ? (latest?.health_score ?? null) : null}
          onRerun={handleRerun}
          showRerun={showHeaderActions}
        />
        <Outlet />
      </main>

      {showTabBar && <BottomTabBar onMoreClick={() => setMoreOpen(true)} />}
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onRerun={handleRerun} />
    </div>
  )
}
