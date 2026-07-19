import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { PayoffTimelineChart } from '../components/charts/PayoffTimelineChart'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useApi } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../lib/api'
import { formatINR } from '../lib/format'
import type { DebtPlanResponse, MonthEntry } from '../types/api'

type Strategy = 'avalanche' | 'snowball'

export function DebtPlannerPage() {
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [extra, setExtra] = useState(2250)
  const debouncedExtra = useDebouncedValue(extra, 300)

  const { data, loading } = useApi<DebtPlanResponse>(
    () => api.get(`/debt/plan?strategy=${strategy}&extra=${debouncedExtra}`),
    [strategy, debouncedExtra],
  )

  if (loading && !data) {
    return (
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_336px]">
        <CardSkeleton />
        <CardSkeleton />
      </section>
    )
  }
  if (!data) return null

  const columns: Array<DataTableColumn<MonthEntry>> = data.selected_schedule[0]
    ? [
        { key: 'month', header: 'Month', render: (r) => <span className="text-[13px] font-semibold">{r.date}</span> },
        ...data.selected_schedule[0].per_debt.map((pd, idx): DataTableColumn<MonthEntry> => ({
          key: `debt-${pd.debt_id}`,
          header: pd.name,
          render: (r) => (
            <span className="text-[13px] text-ink-soft">{formatINR(r.per_debt[idx]?.remaining_balance ?? 0)}</span>
          ),
        })),
        {
          key: 'remaining',
          header: 'Remaining',
          align: 'right',
          render: (r) => <span className="text-[13px] font-bold">{formatINR(r.total_remaining)}</span>,
        },
      ]
    : []

  return (
    <section className="animate-fc-in grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_336px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="flex flex-wrap items-center gap-7">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Strategy</div>
            <div className="inline-flex rounded-2xl bg-bg p-1">
              {(['avalanche', 'snowball'] as Strategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className="min-h-11 rounded-xl px-5 text-[13.5px] font-semibold capitalize transition-all"
                  style={{
                    background: strategy === s ? '#fff' : 'transparent',
                    color: strategy === s ? '#111827' : '#6B7280',
                    boxShadow: strategy === s ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-60 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Extra monthly payment</span>
              <span className="text-[15px] font-bold text-brand" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(extra)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50000}
              step={250}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[10.5px] font-semibold text-ink-faint">
              <span>₹0</span>
              <span>₹50,000</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-1.5 flex items-start justify-between">
            <div>
              <div className="text-base font-bold">Payoff Timeline</div>
              <div className="text-xs font-medium text-ink-faint">Total debt declining to zero</div>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-3.5 border-t-[2.5px] border-danger" /> {strategy}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-3.5 border-t-2 border-dashed border-[#C4C9D2]" /> {strategy === 'avalanche' ? 'snowball' : 'avalanche'}
              </span>
            </div>
          </div>
          <PayoffTimelineChart selected={data.selected.timeline} comparison={data.comparison.timeline} />
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card large={false} className="rounded-3xl">
            <div className="text-[12.5px] font-semibold text-ink-soft">Debt-free date</div>
            <div className="mt-2 text-2xl font-bold">{data.selected.debt_free_date}</div>
          </Card>
          <Card large={false} className="rounded-3xl">
            <div className="text-[12.5px] font-semibold text-ink-soft">Total interest paid</div>
            <div className="mt-2 text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(data.selected.total_interest_paid)}
            </div>
          </Card>
          <div className="rounded-3xl border-[1.5px] border-success/25 bg-success/[0.08] p-5">
            <div className="text-[12.5px] font-semibold text-successDark" style={{ color: '#059669' }}>
              Interest saved
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(data.selected.interest_saved)}
            </div>
          </div>
        </div>

        <Card>
          <div className="mb-4 text-base font-bold">Payment Schedule</div>
          <DataTable
            columns={columns}
            rows={data.selected_schedule.slice(0, 12)}
            keyField={(r) => r.month_index}
            emptyLabel="No debts to schedule."
            renderCard={(r) => (
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">{r.date}</span>
                <span className="text-[13px] font-bold">{formatINR(r.total_remaining)}</span>
              </div>
            )}
          />
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <div className="mb-1 text-[15px] font-bold">Monthly Payment Limit</div>
          <div className="mb-4 text-[12.5px] font-medium text-ink-faint">
            {formatINR(data.monthly_payment_limit.used)} allocated to debt this month
          </div>
          <ProgressBar pct={100} color="#FF6B35" striped height={16} />
        </Card>
        <Card>
          <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">
            <AlertCircle size={13} /> Debt Analyzer says
          </div>
          <div className="text-[13.5px] font-medium leading-relaxed text-ink-soft">{data.narrative}</div>
        </Card>
      </div>
    </section>
  )
}
