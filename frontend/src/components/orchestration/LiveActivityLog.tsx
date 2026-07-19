import { agentColors } from '../../theme/tokens'

export interface LogLine {
  agent: keyof typeof agentColors | 'system'
  text: string
}

interface LiveActivityLogProps {
  lines: LogLine[]
}

export function LiveActivityLog({ lines }: LiveActivityLogProps) {
  return (
    <div className="min-h-[260px] rounded-[28px] bg-surface-dark px-6 py-6 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#8B95A5]">
        <span className="h-2 w-2 rounded-full bg-success" />
        Live activity log
      </div>
      <div className="flex flex-col gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', lineHeight: 1.85 }}>
        {lines.length === 0 && <div className="text-[#8B95A5]">Waiting to start…</div>}
        {lines.map((line, i) => (
          <div key={i} className="animate-fc-in text-[#CBD5E1]">
            <span className="font-medium" style={{ color: line.agent === 'system' ? '#8B95A5' : agentColors[line.agent] }}>
              [{line.agent}]
            </span>{' '}
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}
