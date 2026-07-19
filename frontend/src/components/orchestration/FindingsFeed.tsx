import { Card } from '../ui/Card'
import { AgentTag } from '../ui/AgentTag'
import { agentColors } from '../../theme/tokens'

export interface Finding {
  agent: keyof typeof agentColors
  text: string
}

interface FindingsFeedProps {
  findings: Finding[]
}

export function FindingsFeed({ findings }: FindingsFeedProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Findings so far</div>
      {findings.length === 0 && <div className="text-[13px] font-medium text-ink-faint">Nothing yet…</div>}
      {findings.map((f, i) => (
        <Card key={i} padded={false} large={false} className="animate-fc-in rounded-[20px] p-4">
          <AgentTag agent={f.agent} />
          <div className="mt-2.5 text-[13.5px] font-semibold leading-snug text-ink-soft">{f.text}</div>
        </Card>
      ))}
    </div>
  )
}
