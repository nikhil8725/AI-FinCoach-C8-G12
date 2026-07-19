import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusPill } from '../components/ui/StatusPill'
import { CardSkeleton } from '../components/ui/Skeleton'
import { AddGoalPanel } from '../components/savings/AddGoalPanel'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { formatINR, formatDate } from '../lib/format'
import { colors } from '../theme/tokens'
import type { GoalCreate, GoalOut, SavingsResponse } from '../types/api'

export function SavingsPage() {
  const { showToast } = useToast()
  const { data, loading, refetch } = useApi<SavingsResponse>(() => api.get('/savings'), [])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const handleCreateGoal = async (goal: GoalCreate) => {
    setSubmitting(true)
    try {
      await api.post('/savings/goals', goal)
      setModalOpen(false)
      refetch()
    } catch {
      showToast('Could not create this goal.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !data) {
    return (
      <section className="grid grid-cols-1 gap-5">
        <CardSkeleton />
        <CardSkeleton />
      </section>
    )
  }

  const ef = data.emergency_fund
  const efPct = ef.target > 0 ? Math.min(100, (ef.current / ef.target) * 100) : 0
  const efGapAmount = Math.max(0, ef.target - ef.current)
  const runwayPct = Math.min(100, (ef.runway_months / ef.months_target) * 100)

  return (
    <section className="animate-fc-in flex flex-col gap-5">
      <Card className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-3.5">
            <StatusPill tone="success">Emergency Fund</StatusPill>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(ef.current)}
            </span>
            <span className="text-[15px] font-semibold text-ink-faint">of {formatINR(ef.target)} target</span>
          </div>
          <div className="mt-4">
            <ProgressBar pct={efPct} color={colors.success} striped height={16} />
          </div>
          <div className="mt-3 text-[13px] font-medium text-ink-soft">
            You're <strong className="text-ink">{formatINR(efGapAmount)}</strong> away from a full {ef.months_target}-month safety net.
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Runway</div>
          <div className="relative h-[130px] w-[130px]">
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="65" cy="65" r="54" fill="none" stroke="#EFF1F4" strokeWidth="11" />
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                stroke={colors.success}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${(runwayPct / 100) * 339} 339`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-bold">{ef.runway_months}</span>
              <span className="text-[11px] font-semibold text-ink-faint">months</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold">Your Goals</div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add goal
            </Button>
          </div>
          {data.goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
          {data.goals.length === 0 && <div className="text-sm text-ink-faint">No goals yet — add one to get started.</div>}
        </div>

        <Card>
          <div className="text-base font-bold">Where the money comes from</div>
          <div className="mb-4 mt-1 text-xs font-medium text-ink-faint">Savings Strategist suggestions</div>
          <div className="flex flex-col gap-3">
            {data.reallocations
              .filter((_, i) => !dismissed.has(i))
              .map((r, i) => (
                <div key={i} className="rounded-2xl border border-border-subtle p-4">
                  <div className="mb-3 text-[13px] font-semibold leading-snug text-ink-soft">{r.rationale}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        showToast('Reallocation accepted.')
                        setDismissed((prev) => new Set(prev).add(i))
                      }}
                      className="min-h-9 flex-1 rounded-xl bg-success/10 text-[12.5px] font-semibold text-successDark hover:bg-success/20"
                      style={{ color: '#059669' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setDismissed((prev) => new Set(prev).add(i))}
                      className="min-h-9 rounded-xl bg-bg px-4 text-[12.5px] font-semibold text-ink-soft hover:bg-[#E9EBEF]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            {data.reallocations.length === 0 && <div className="text-sm text-ink-faint">No suggestions right now.</div>}
          </div>
        </Card>
      </div>

      <AddGoalPanel open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreateGoal} submitting={submitting} />
    </section>
  )
}

function GoalCard({ goal }: { goal: GoalOut }) {
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
  const onTrack = goal.status === 'on_track' || goal.status === 'completed'
  return (
    <Card large={false} className="rounded-3xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold">{goal.name}</div>
          <div className="text-xs font-medium text-ink-faint">
            {goal.target_date ? `by ${formatDate(goal.target_date)}` : 'no deadline'}
            {goal.monthly_contribution ? ` · ${formatINR(goal.monthly_contribution)}/mo needed` : ''}
          </div>
        </div>
        <StatusPill tone={goal.status === 'completed' ? 'success' : onTrack ? 'info' : 'warning'}>
          {goal.status.replace('_', ' ')}
        </StatusPill>
      </div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-lg font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatINR(goal.current_amount)}
        </span>
        <span className="text-xs font-semibold text-ink-faint">/ {formatINR(goal.target_amount)}</span>
      </div>
      <ProgressBar pct={pct} color={onTrack ? colors.success : colors.brand} height={8} />
    </Card>
  )
}
