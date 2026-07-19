import { AgentTag } from '../ui/AgentTag'
import { CitationChips } from './CitationChips'
import { TypingIndicator } from './TypingIndicator'
import { renderBoldMarkdown } from '../../lib/markdown'
import type { ChatMessageOut, Citation } from '../../types/api'

interface MessageBubbleProps {
  message: ChatMessageOut
  onSelectCitation: (citation: Citation) => void
}

function isAgentKey(agent: string | null): agent is 'data' | 'debt' | 'savings' | 'budget' {
  return agent === 'data' || agent === 'debt' || agent === 'savings' || agent === 'budget'
}

export function MessageBubble({ message, onSelectCitation }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="animate-fc-in max-w-[64%] self-end rounded-2xl bg-ink px-4.5 py-3.5 text-sm font-medium leading-relaxed text-white">
        {message.content}
      </div>
    )
  }

  // An assistant placeholder with no content yet means we're waiting on the first token —
  // show the typing dots instead of an empty card.
  if (message.content === '') {
    return <TypingIndicator />
  }

  return (
    <div className="animate-fc-in max-w-[72%] self-start rounded-2xl bg-surface p-5 shadow-card">
      {isAgentKey(message.agent) && (
        <div className="mb-2.5">
          <AgentTag agent={message.agent} />
        </div>
      )}
      <div
        className="text-sm font-medium leading-relaxed text-ink-soft"
        dangerouslySetInnerHTML={{ __html: renderBoldMarkdown(message.content) }}
      />
      <CitationChips citations={message.citations} onSelect={onSelectCitation} />
    </div>
  )
}
