import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AgentTag } from '../ui/AgentTag'
import type { InsightOut } from '../../types/api'

const severityColor: Record<string, string> = {
  info: '#3B82F6',
  warning: '#EF4444',
  success: '#10B981',
}

function isAgentKey(agent: string): agent is 'data' | 'debt' | 'savings' | 'budget' {
  return ['data_agent', 'debt_agent', 'savings_agent', 'budget_agent'].includes(agent)
}

function toAgentKey(agent: string): 'data' | 'debt' | 'savings' | 'budget' {
  return agent.replace('_agent', '') as 'data' | 'debt' | 'savings' | 'budget'
}

export function InsightAccordion({ insight }: { insight: InsightOut }) {
  const [open, setOpen] = useState(false)
  const dotColor = severityColor[insight.severity ?? 'info'] ?? '#3B82F6'

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-bg"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />
        {isAgentKey(insight.agent) && <AgentTag agent={toAgentKey(insight.agent)} />}
        <span className="flex-1 text-[13px] font-medium text-ink-soft">{insight.title}</span>
        <ChevronDown size={16} className="shrink-0 text-ink-faint transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div className="animate-fc-in px-4 pb-4 pl-11">
          <div className="mb-2 text-[13px] font-medium text-ink-soft">{insight.body}</div>
          {insight.evidence.length > 0 && (
            <>
              <div className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Evidence — source transactions
              </div>
              <div className="overflow-hidden rounded-xl border border-border-subtle" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {insight.evidence.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border-subtle bg-[#FCFCFD] px-3.5 py-2.5 text-xs last:border-b-0">
                    <span className="font-medium text-ink-soft">{ev.snippet}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 font-mono text-[10.5px] text-ink-faint">{insight.evidence[0].source_file}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
