import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatINR, formatMonth } from '../../lib/format'
import type { CashFlowPoint } from '../../types/api'

interface CashFlowChartProps {
  data: CashFlowPoint[]
}

function CashFlowTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const income = payload.find((p) => p.dataKey === 'income')?.value ?? 0
  const spend = payload.find((p) => p.dataKey === 'spend')?.value ?? 0
  return (
    <div className="rounded-xl bg-ink px-3.5 py-2.5 text-xs text-white shadow-lg">
      <div className="mb-1 font-bold">{formatMonth(`${label}-01`)}</div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#60A5FA' }} /> Income {formatINR(Number(income))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#9CA3AF' }} /> Spend {formatINR(Number(spend))}
      </div>
    </div>
  )
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (data.length === 0) {
    return <div className="flex h-60 items-center justify-center text-sm text-ink-faint">No cash flow data yet.</div>
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <div style={{ minWidth: Math.max(320, data.length * 70) }}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#F1F2F4" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => formatMonth(`${m}-01`)}
              tick={{ fontSize: 10, fill: '#C4C9D2', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, (max: number) => max * 1.15]} />
            <Tooltip content={(props) => <CashFlowTooltip {...props} />} />
            <Area type="monotone" dataKey="income" stroke="none" fill="url(#cfGrad)" isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="spend"
              stroke="#111827"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
