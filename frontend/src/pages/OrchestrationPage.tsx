import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { AgentPipeline, type NodeStatus } from '../components/orchestration/AgentPipeline'
import { LiveActivityLog, type LogLine } from '../components/orchestration/LiveActivityLog'
import { FindingsFeed, type Finding } from '../components/orchestration/FindingsFeed'
import { useSSE } from '../hooks/useSSE'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { AnalysisCompleteEvent, AnalysisEvent } from '../types/api'

type AgentKey = 'data' | 'debt' | 'savings' | 'budget'

const AGENT_TASKS: Record<AgentKey, string> = {
  data: 'parsing & categorizing',
  debt: 'simulating payoff plans',
  savings: 'sizing your emergency fund',
  budget: 'checking your 50/30/20',
}

const PARALLEL_ORDER: AgentKey[] = ['data', 'debt', 'savings', 'budget']

function isCompleteEvent(e: AnalysisEvent | AnalysisCompleteEvent): e is AnalysisCompleteEvent {
  return (e as AnalysisCompleteEvent).status === 'complete'
}

export function OrchestrationPage() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { start } = useSSE<AnalysisEvent | AnalysisCompleteEvent>()
  const started = useRef(false)

  const [statuses, setStatuses] = useState<Record<AgentKey, NodeStatus>>({
    data: 'pending',
    debt: 'pending',
    savings: 'pending',
    budget: 'pending',
  })
  const [synthesizerStatus, setSynthesizerStatus] = useState<NodeStatus>('pending')
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    start('/analyze', undefined, {
      onEvent: (event) => {
        if (isCompleteEvent(event)) {
          setComplete(true)
          setTimeout(() => navigate('/dashboard'), 1400)
          return
        }
        if (event.agent === 'synthesizer') {
          setSynthesizerStatus(event.status)
        } else if (event.agent in AGENT_TASKS) {
          const key = event.agent as AgentKey
          setStatuses((prev) => ({ ...prev, [key]: event.status }))
          if (event.status === 'done') {
            setFindings((prev) => [...prev, { agent: key, text: event.message }])
          }
        }
        setLogLines((prev) => [
          ...prev,
          { agent: event.agent in AGENT_TASKS || event.agent === 'synthesizer' ? (event.agent as AgentKey) : 'system', text: event.message },
        ])
      },
      onError: (message) => setError(message),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agents = PARALLEL_ORDER.map((key) => ({ key, task: AGENT_TASKS[key], status: statuses[key] }))

  return (
    <section className="animate-fc-in flex flex-col gap-6">
      {complete && (
        <div
          className="animate-fc-in flex items-center gap-3 rounded-[20px] border border-success/25 bg-success/10 px-5.5 py-4 font-semibold"
          style={{ color: '#059669' }}
        >
          <CheckCircle2 size={20} className="text-success" />
          Analysis complete — opening your dashboard…
        </div>
      )}
      {error && (
        <div className="animate-fc-in rounded-[20px] border border-danger/25 bg-danger/10 px-5.5 py-4 font-semibold text-danger">
          {error}
        </div>
      )}

      <Card className="!p-9">
        <div className="mb-1 text-lg font-bold">Agent Orchestration</div>
        <div className="mb-7 text-[13.5px] font-medium text-ink-faint">
          Four specialists working in parallel on your documents
        </div>
        <AgentPipeline agents={agents} synthesizerStatus={synthesizerStatus} orientation={isMobile ? 'vertical' : 'horizontal'} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <LiveActivityLog lines={logLines} />
        <FindingsFeed findings={findings} />
      </div>
    </section>
  )
}
