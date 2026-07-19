import { useState } from 'react'
import { ArrowUp, CreditCard, Landmark, PiggyBank, Search, SlidersHorizontal, TrendingUp, Wallet } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatusPill } from '../components/ui/StatusPill'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DonutChart } from '../components/ui/DonutChart'
import { HealthRing } from '../components/ui/HealthRing'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { CashFlowChart } from '../components/charts/CashFlowChart'
import { InsightAccordion } from '../components/dashboard/InsightAccordion'
import { CardSkeleton } from '../components/ui/Skeleton'
import { RangeSelector, type PeriodRange } from '../components/ui/RangeSelector'
import { useApi } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { formatDate, formatINR, formatPct } from '../lib/format'
import { colors } from '../theme/tokens'
import type { DashboardResponse, TransactionListResponse, TransactionOut } from '../types/api'

const CATEGORY_COLORS = ['#3B82F6', '#EF4444', '#FF6B35', '#10B981', '#8B5CF6', '#F59E0B', '#6B7280']

const ACCOUNT_ICON: Record<string, typeof Landmark> = {
  bank: Landmark,
  credit_card: CreditCard,
  personal_loan: Wallet,
  other: PiggyBank,
}

function healthColor(score: number): string {
  if (score >= 70) return colors.success
  if (score >= 40) return colors.brand
  return colors.danger
}

export function DashboardPage() {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [period, setPeriod] = useState<PeriodRange>('1m')

  const { data, loading } = useApi<DashboardResponse>(() => api.get(`/dashboard?period=${period}`), [period])
  const { data: txnPage } = useApi<TransactionListResponse>(
    () => api.get(`/transactions?search=${encodeURIComponent(debouncedSearch)}&page_size=8`),
    [debouncedSearch],
  )

  if (loading || !data) {
    return (
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </section>
    )
  }

  const totalBalance = data.accounts.reduce((sum, a) => sum + a.balance, 0)
  const donutTotal = data.category_split.reduce((sum, c) => sum + c.amount, 0)
  const hb = data.health_score

  return (
    <section className="animate-fc-in flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Showing</span>
        <RangeSelector value={period} onChange={setPeriod} />
      </div>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[4fr_3fr_5fr]">
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-soft">
              Total Balance
              <span title="Net position: assets minus debts" className="cursor-help text-ink-faint">?</span>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs font-semibold">🇮🇳 ₹ INR</span>
          </div>
          <div className="mt-4 text-3xl font-bold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalBalance)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-success">
            <ArrowUp size={13} /> Live balance across accounts
          </div>
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={() => showToast('Transfers are not available in this demo.')}
              className="min-h-11 flex-1 rounded-2xl bg-ink text-[13.5px] font-semibold text-white hover:bg-black"
            >
              Transfer
            </button>
            <button
              onClick={() => showToast('Requests are not available in this demo.')}
              className="min-h-11 flex-1 rounded-2xl border-2 border-border text-[13.5px] font-semibold hover:border-ink"
            >
              Request
            </button>
          </div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Accounts</div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {data.accounts.slice(0, 3).map((a) => {
              const Icon = ACCOUNT_ICON[a.account_type] ?? ACCOUNT_ICON.other
              const positive = a.balance >= 0
              return (
                <div key={a.document_id + a.name} className="rounded-2xl border border-border-subtle bg-bg p-3">
                  <div
                    className="mb-2 flex h-7.5 w-7.5 items-center justify-center rounded-[10px]"
                    style={{ background: positive ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)', color: positive ? '#3B82F6' : '#EF4444' }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="truncate text-[11.5px] font-semibold text-ink-soft">{a.name}</div>
                  <StatusPill tone={positive ? 'info' : 'danger'}>{positive ? 'Active' : 'Debt'}</StatusPill>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="grid grid-cols-2 grid-rows-2 gap-3.5">
          <div className="flex flex-col rounded-3xl bg-gradient-to-br from-brand to-brand-light p-5 text-white shadow-[0_8px_22px_rgba(255,107,53,0.28)]">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold opacity-90">Monthly Income</span>
              <TrendingUp size={18} className="opacity-90" />
            </div>
            <div className="mt-auto text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(data.kpis.monthly_income)}
            </div>
          </div>
          <StatTile label="Monthly Spend" value={formatINR(data.kpis.monthly_spend)} icon={Wallet} />
          <StatTile label="Total Debt" value={formatINR(data.kpis.total_debt)} icon={CreditCard} />
          <StatTile label="Savings Rate" value={formatPct(data.kpis.savings_rate)} icon={PiggyBank} />
        </div>

        <Card className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold">Cash Flow</div>
              <div className="text-xs font-medium text-ink-faint">
                {data.cash_flow.length === 1 ? 'latest month' : `last ${data.cash_flow.length} months`}
              </div>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />Income</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-3.5 border-t-2 border-dashed border-ink" />Spending</span>
            </div>
          </div>
          <div className="mt-3 flex-1">
            <CashFlowChart data={data.cash_flow} />
          </div>
        </Card>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_7fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-bold">Debt Overview</div>
            <a href="/debt" className="text-[13px] font-semibold">Open Debt Planner →</a>
          </div>
          <div className="flex flex-col gap-4.5">
            {data.debts.length === 0 && <div className="text-sm text-ink-faint">No debts — you're debt-free!</div>}
            {data.debts.map((d) => (
              <div key={d.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-semibold">{d.name}</div>
                    <div className="text-[11.5px] font-medium text-ink-faint">min {formatINR(d.minimum_payment)}/mo</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(d.principal_balance)}</div>
                    <StatusPill tone={d.apr > 30 ? 'danger' : 'warning'}>{d.apr.toFixed(0)}% APR</StatusPill>
                  </div>
                </div>
                <ProgressBar pct={d.paid_pct} color={d.apr > 30 ? colors.danger : colors.brand} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <div className="text-base font-bold">AI Insights</div>
            <span className="rounded-lg bg-[#3B82F6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#3B82F6]">RAG-grounded</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {data.insights.length === 0 && <div className="text-sm text-ink-faint">Run an analysis to see insights.</div>}
            {data.insights.map((ins) => (
              <InsightAccordion key={ins.id} insight={ins} />
            ))}
          </div>
        </Card>
      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_7fr]">
        <Card>
          <div className="mb-1.5 text-base font-bold">Spending by Category</div>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart
              segments={data.category_split.map((c, i) => ({ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], pct: c.pct }))}
              centerLabel="Total"
              centerValue={formatINR(donutTotal)}
            />
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
              {data.category_split.map((c, i) => (
                <div key={c.category} className="flex min-w-0 items-center gap-2.5 text-[12.5px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="flex-1 truncate font-semibold capitalize text-ink-soft">{c.category}</span>
                  <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(c.amount)}</span>
                  <span className="w-9 text-right font-semibold text-ink-faint">{formatPct(c.pct)}</span>
                </div>
              ))}
              {data.category_split.length === 0 && <div className="text-sm text-ink-faint">No spending data yet.</div>}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-5">
            <div className="text-base font-bold">Health Score Breakdown</div>
            <div className="ml-auto">
              <HealthRing score={hb.total} color={healthColor(hb.total)} size={54} strokeWidth={6} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6.5">
            <HealthBar label="Debt load" value={hb.debt_load} note={hb.notes.debt_load} />
            <HealthBar label="Emergency fund" value={hb.emergency_fund} note={hb.notes.emergency_fund} />
            <HealthBar label="Savings rate" value={hb.savings_rate} note={hb.notes.savings_rate} />
            <HealthBar label="Spending discipline" value={hb.spending_discipline} note={hb.notes.spending_discipline} />
          </div>
        </Card>
      </div>

      {/* ROW 4 */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base font-bold">Recent Activities</div>
          <div className="flex gap-2.5">
            <div className="flex w-full items-center gap-2 rounded-full bg-bg px-4 py-2.5 sm:w-60">
              <Search size={15} className="text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions"
                className="w-full bg-transparent text-[13px] text-ink-soft outline-none"
              />
            </div>
            <button
              onClick={() => showToast('Category filtering coming soon.')}
              className="flex min-h-11 items-center gap-1.5 rounded-2xl border-2 border-border px-4 text-[13px] font-semibold hover:border-ink"
            >
              <SlidersHorizontal size={15} /> Filter
            </button>
          </div>
        </div>
        <RecentActivitiesTable transactions={txnPage?.items ?? data.recent_transactions} />
      </Card>
    </section>
  )
}

function StatTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="flex flex-col rounded-3xl bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
        <span className="flex h-7.5 w-7.5 items-center justify-center rounded-[10px] bg-bg text-ink-soft">
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-auto text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

function HealthBar({ label, value, note }: { label: string; note: string; value: number }) {
  const color = value >= 70 ? colors.success : value >= 40 ? colors.brand : colors.danger
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold">
        <span className="text-ink-soft">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <ProgressBar pct={value} color={color} />
      <div className="mt-1.5 text-[11px] font-medium leading-snug text-ink-faint">{note}</div>
    </div>
  )
}

function RecentActivitiesTable({ transactions }: { transactions: TransactionOut[] }) {
  const columns: Array<DataTableColumn<TransactionOut>> = [
    {
      key: 'merchant',
      header: 'Activity',
      render: (t) => <span className="text-[13px] font-semibold">{t.merchant ?? t.description}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (t) => (
        <span className="text-[13.5px] font-bold" style={{ color: t.txn_type === 'credit' ? colors.success : colors.ink }}>
          {t.txn_type === 'credit' ? '+' : '-'}
          {formatINR(t.amount)}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => <StatusPill tone="neutral">{t.category}</StatusPill>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (t) => <span className="text-xs font-medium text-ink-faint">{formatDate(t.date)}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={transactions}
      keyField={(t) => t.id}
      emptyLabel="No transactions found."
      renderCard={(t) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">{t.merchant ?? t.description}</div>
            <div className="text-xs font-medium text-ink-faint">{formatDate(t.date)} · {t.category}</div>
          </div>
          <span className="shrink-0 text-[13.5px] font-bold" style={{ color: t.txn_type === 'credit' ? colors.success : colors.ink }}>
            {t.txn_type === 'credit' ? '+' : '-'}
            {formatINR(t.amount)}
          </span>
        </div>
      )}
    />
  )
}
