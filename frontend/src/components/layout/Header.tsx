import { Sparkles } from 'lucide-react'
import { HealthRing } from '../ui/HealthRing'
import { colors } from '../../theme/tokens'

interface HeaderProps {
  title: string
  subtitle: string
  healthScore: number | null
  onRerun: () => void
  showRerun?: boolean
}

function healthColor(score: number): string {
  if (score >= 70) return colors.success
  if (score >= 40) return colors.brand
  return colors.danger
}

function healthLabel(score: number): string {
  if (score >= 70) return 'Strong'
  if (score >= 40) return 'Needs work'
  return 'At risk'
}

export function Header({ title, subtitle, healthScore, onRerun, showRerun = true }: HeaderProps) {
  return (
    <header className="flex items-center gap-5 px-1 pb-6 pt-2">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate text-2xl font-bold tracking-tight sm:text-[34px]">{title}</h1>
        <div className="mt-1 text-sm font-medium text-ink-soft">{subtitle}</div>
      </div>

      {healthScore !== null && (
        <div className="hidden items-center gap-2.5 rounded-[20px] bg-surface py-2.5 pl-3 pr-4 shadow-card sm:flex">
          <HealthRing score={healthScore} color={healthColor(healthScore)} />
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Health</div>
            <div className="text-[13px] font-semibold text-ink-soft">{healthLabel(healthScore)}</div>
          </div>
        </div>
      )}

      {showRerun && (
        <button
          type="button"
          onClick={onRerun}
          className="hidden min-h-11 items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(17,24,39,0.22)] transition-transform hover:-translate-y-px sm:flex"
        >
          <Sparkles size={16} className="text-brand-light" />
          Re-run Analysis
        </button>
      )}
    </header>
  )
}
