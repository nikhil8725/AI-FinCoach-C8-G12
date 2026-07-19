import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINR } from '../../lib/format'

interface TimelinePoint {
  month_index: number
  total_remaining: number
}

interface PayoffTimelineChartProps {
  selected: TimelinePoint[]
  comparison: TimelinePoint[]
}

function mergeTimelines(selected: TimelinePoint[], comparison: TimelinePoint[]) {
  const maxLen = Math.max(selected.length, comparison.length)
  const points: Array<{ month: number; selected: number; comparison: number }> = []
  for (let i = 0; i < maxLen; i++) {
    points.push({
      month: i + 1,
      selected: selected[i]?.total_remaining ?? 0,
      comparison: comparison[i]?.total_remaining ?? 0,
    })
  }
  return points
}

export function PayoffTimelineChart({ selected, comparison }: PayoffTimelineChartProps) {
  if (selected.length === 0) {
    return <div className="flex h-52 items-center justify-center text-sm text-ink-faint">No debts to simulate.</div>
  }

  const data = mergeTimelines(selected, comparison)

  return (
    <ResponsiveContainer width="100%" height={216}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#F1F2F4" />
        <XAxis
          dataKey="month"
          tickFormatter={(m: number) => `M${m}`}
          tick={{ fontSize: 10, fill: '#C4C9D2', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          formatter={(value) => formatINR(Number(value))}
          labelFormatter={(m) => `Month ${m}`}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.15)', fontSize: 12 }}
        />
        <Area type="monotone" dataKey="selected" stroke="none" fill="url(#dpGrad)" isAnimationActive={false} />
        <Line type="monotone" dataKey="comparison" stroke="#C4C9D2" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="selected"
          stroke="#EF4444"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
