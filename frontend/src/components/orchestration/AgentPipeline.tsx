import { agentColors, agentLabels, colors, tint } from '../../theme/tokens'

export type NodeStatus = 'pending' | 'running' | 'done' | 'error'

interface AgentPipelineProps {
  agents: Array<{ key: keyof typeof agentColors; task: string; status: NodeStatus }>
  synthesizerStatus: NodeStatus
  orientation?: 'horizontal' | 'vertical'
}

function StatusDot({ status, color }: { status: NodeStatus; color: string }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: status === 'pending' ? colors.borderSubtle : color,
        boxShadow: status === 'running' ? `0 0 0 4px ${tint(color, 0.25)}` : undefined,
        animation: status === 'running' ? 'fc-pulse 1.2s ease-in-out infinite' : undefined,
      }}
    />
  )
}

export function AgentPipeline({ agents, synthesizerStatus, orientation = 'horizontal' }: AgentPipelineProps) {
  const vertical = orientation === 'vertical'

  return (
    <div className={vertical ? 'flex flex-col items-stretch gap-4' : 'flex items-center gap-0'}>
      <div className={vertical ? '' : 'flex w-[150px] shrink-0 flex-col items-center gap-2'}>
        <div className="w-full rounded-2xl bg-ink px-4 py-3.5 text-center text-white shadow-[0_6px_18px_rgba(17,24,39,0.25)]">
          <div className="text-[13px] font-bold">Orchestrator</div>
          <div className="mt-0.5 text-[11px] opacity-70">routing tasks</div>
        </div>
      </div>

      {!vertical && <div className="h-px w-8 shrink-0 bg-border" />}

      <div className={vertical ? 'flex flex-col gap-3 border-l-2 border-border pl-4' : 'flex flex-1 flex-col gap-3'}>
        {agents.map((a) => {
          const color = agentColors[a.key]
          return (
            <div
              key={a.key}
              className="flex items-center gap-3.5 rounded-2xl border-[1.5px] px-4.5 py-3.5 transition-all"
              style={{
                background: a.status === 'pending' ? '#fff' : tint(color, 0.08),
                borderColor: a.status === 'pending' ? '#F1F2F4' : tint(color, 0.3),
              }}
            >
              <StatusDot status={a.status} color={color} />
              <div className="flex-1">
                <div className="text-sm font-bold">{agentLabels[a.key]}</div>
                <div className="text-xs font-medium text-ink-soft">{a.task}</div>
              </div>
              {a.status === 'done' && <span className="text-xs font-bold text-success">✓</span>}
              {a.status === 'error' && <span className="text-xs font-bold text-danger">!</span>}
            </div>
          )
        })}
      </div>

      {!vertical && <div className="h-px w-8 shrink-0 bg-border" />}

      <div className={vertical ? '' : 'flex w-[150px] shrink-0 flex-col items-center gap-2'}>
        <div
          className="w-full rounded-2xl border-[1.5px] px-4 py-3.5 text-center transition-all"
          style={{
            background: synthesizerStatus === 'done' ? tint(colors.success, 0.1) : '#fff',
            borderColor: synthesizerStatus === 'done' ? tint(colors.success, 0.3) : '#F1F2F4',
            color: synthesizerStatus === 'done' ? colors.successDark : colors.ink,
          }}
        >
          <div className="text-[13px] font-bold">Financial Plan</div>
          <div className="mt-0.5 text-[11px] opacity-70">
            {synthesizerStatus === 'done' ? 'ready' : synthesizerStatus === 'running' ? 'merging…' : 'waiting'}
          </div>
        </div>
      </div>
    </div>
  )
}
