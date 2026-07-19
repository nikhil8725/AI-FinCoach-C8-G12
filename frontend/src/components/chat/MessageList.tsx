import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { ChatMessageOut, Citation } from '../../types/api'

interface MessageListProps {
  messages: ChatMessageOut[]
  onSelectCitation: (citation: Citation) => void
}

export function MessageList({ messages, onSelectCitation }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastContentLength = messages.at(-1)?.content.length ?? 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, lastContentLength])

  return (
    <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-1.5 pb-5 pt-1.5">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} onSelectCitation={onSelectCitation} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
