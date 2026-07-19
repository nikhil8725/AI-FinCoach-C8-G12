import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatusPill } from '../components/ui/StatusPill'
import { CardSkeleton } from '../components/ui/Skeleton'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { RangeSelector, type PeriodRange } from '../components/ui/RangeSelector'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { formatINR, formatPct } from '../lib/format'
import { splitColors } from '../theme/tokens'
import type { BudgetResponse, CategoryCapOut } from '../types/api'

type Tone = 'ok' | 'warning' | 'over'
const statusTone: Record<Tone, 'success' | 'warning' | 'danger'> = { ok: 'success', warning: 'warning', over: 'danger' }

function SplitBar({ needs, wants, savings, overNeeds, overWants }: { needs: number; wants: number; savings: number; overNeeds?: boolean; overWants?: boolean }) {
  return (
    <div className="flex h-8.5 overflow-hidden rounded-xl text-xs font-bold text-white">
      <div
        className="flex items-center pl-3"
        style={{ width: `${needs}%`, background: splitColors.needs, outline: overNeeds ? '2px solid #EF4444' : undefined, outlineOffset: -2 }}
      >
        {needs > 8 ? formatPct(needs) : ''}
      </div>
      <div
        className="flex items-center pl-3"
        style={{ width: `${wants}%`, background: splitColors.wants, outline: overWants ? '2px solid #EF4444' : undefined, outlineOffset: -2 }}
      >
        {wants > 8 ? formatPct(wants) : ''}
      </div>
      <div className="flex items-center pl-2" style={{ width: `${savings}%`, background: splitColors.savings }}>
        {savings > 8 ? formatPct(savings) : ''}
      </div>
    </div>
  )
}

export function BudgetPage() {
  const { showToast } = useToast()
  const [period, setPeriod] = useState<PeriodRange>('1m')
  const { data, loading, refetch } = useApi<BudgetResponse>(() => api.get(`/budget?period=${period}`), [period])
  const [editing, setEditing] = useState<Record<string, string>>({})

  if (loading || !data) {
    return (
      <section className="grid grid-cols-1 gap-5">
        <CardSkeleton />
        <CardSkeleton />
      </section>
    )
  }

  const handleCapChange = (category: string, value: string) => {
    setEditing((prev) => ({ ...prev, [category]: value }))
  }

  const commitCap = async (category: string) => {
    const raw = editing[category]
    if (raw === undefined) return
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) return
    try {
      await api.patch(`/budget/caps/${category}?period=${period}`, { cap_amount: amount })
      refetch()
    } catch {
      showToast('Could not update this cap.')
    }
  }

  const CapInput = ({ c }: { c: CategoryCapOut }) => (
    <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border bg-surface px-3 py-1.5">
      <span className="text-[13px] text-ink-faint">₹</span>
      <input
        type="number"
        value={editing[c.category] ?? String(c.cap_amount)}
        onChange={(e) => handleCapChange(c.category, e.target.value)}
        onBlur={() => commitCap(c.category)}
        className="w-16 bg-transparent text-[13px] font-semibold outline-none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </div>
  )

  const periodLabel = period === '1m' ? 'Latest month' : `Last ${period.replace('m', '')} months`

  const columns: Array<DataTableColumn<CategoryCapOut>> = [
    { key: 'category', header: 'Category', render: (c) => <span className="text-[13.5px] font-semibold capitalize">{c.category}</span> },
    { key: 'actual', header: periodLabel, render: (c) => <span className="text-[13px] text-ink-soft">{formatINR(c.actual_amount)}</span> },
    { key: 'cap', header: 'Suggested cap', render: (c) => <CapInput c={c} /> },
    { key: 'status', header: 'Status', align: 'right', render: (c) => <StatusPill tone={statusTone[c.status]}>{c.status}</StatusPill> },
  ]

  return (
    <section className="animate-fc-in flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Showing</span>
        <RangeSelector value={period} onChange={setPeriod} />
      </div>

      <Card>
        <div className="mb-5.5 flex items-center gap-3">
          <div className="text-base font-bold">50 / 30 / 20 Comparison</div>
          <div className="ml-auto flex gap-3.5 text-xs font-semibold text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: splitColors.needs }} />Needs</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: splitColors.wants }} />Wants</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: splitColors.savings }} />Savings</span>
          </div>
        </div>
        <div className="flex flex-col gap-5.5">
          <div>
            <div className="mb-2 text-xs font-semibold text-ink-soft">Your current split</div>
            <SplitBar
              needs={data.actual_split.needs}
              wants={data.actual_split.wants}
              savings={data.actual_split.savings}
              overNeeds={data.over_target.includes('needs')}
              overWants={data.over_target.includes('wants')}
            />
            {data.over_target.length > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-2.5 py-1 text-[11.5px] font-semibold text-dangerDark" style={{ color: '#DC2626' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {data.over_target.join(' & ')} over target — trim here first
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-ink-soft">Recommended</div>
            <SplitBar needs={data.target_split.needs} wants={data.target_split.wants} savings={data.target_split.savings} />
          </div>
        </div>
      </Card>

      {data.alerts.map((alert, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-brand/20 bg-brand/[0.07] px-5.5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <AlertTriangle size={18} />
          </span>
          <div className="flex-1 text-[13.5px] font-bold text-ink-soft">{alert.message}</div>
        </div>
      ))}

      <Card>
        <div className="text-base font-bold">Category Budgets</div>
        <div className="mb-4 mt-1 text-xs font-medium text-ink-faint">Edit any suggested cap — status recalculates live.</div>
        <DataTable
          columns={columns}
          rows={data.category_caps}
          keyField={(c) => c.category}
          emptyLabel="No spending data yet."
          renderCard={(c) => (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold capitalize">{c.category}</span>
                <StatusPill tone={statusTone[c.status]}>{c.status}</StatusPill>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-faint">{periodLabel}: {formatINR(c.actual_amount)}</span>
                <CapInput c={c} />
              </div>
            </div>
          )}
        />
      </Card>
    </section>
  )
}
