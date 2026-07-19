import { useEffect, useState } from 'react'
import { MessageList } from '../components/chat/MessageList'
import { SuggestedQuestions } from '../components/chat/SuggestedQuestions'
import { ChatInput } from '../components/chat/ChatInput'
import { CitationPanel } from '../components/chat/CitationPanel'
import { useSSE } from '../hooks/useSSE'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import type { ChatMessageOut, Citation } from '../types/api'

type ChatSSEEvent = { token: string } | { citations: Citation[]; agent: string }

const SUGGESTIONS = [
  'When will I be debt-free?',
  'Can I afford a ₹15L car?',
  'Where did I overspend last month?',
]

function isTokenEvent(e: ChatSSEEvent): e is { token: string } {
  return 'token' in e
}

export function CoachChatPage() {
  const { showToast } = useToast()
  const { start, isStreaming } = useSSE<ChatSSEEvent>()
  const [messages, setMessages] = useState<ChatMessageOut[]>([])
  const [citationOpen, setCitationOpen] = useState<Citation | null>(null)

  useEffect(() => {
    api
      .get<ChatMessageOut[]>('/chat/messages')
      .then(setMessages)
      .catch(() => showToast('Could not load chat history.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = (text: string) => {
    const userMsg: ChatMessageOut = {
      id: Date.now(),
      role: 'user',
      content: text,
      agent: null,
      citations: [],
      created_at: new Date().toISOString(),
    }
    const assistantId = Date.now() + 1
    const assistantMsg: ChatMessageOut = {
      id: assistantId,
      role: 'assistant',
      content: '',
      agent: null,
      citations: [],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    start('/chat', { message: text }, {
      onEvent: (event) => {
        if (isTokenEvent(event)) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.token } : m)),
          )
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, agent: event.agent, citations: event.citations } : m)),
          )
        }
      },
      onError: () => {
        showToast('The coach could not respond. Please try again.')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.content
              ? { ...m, content: 'Something went wrong answering that — please try again.' }
              : m,
          ),
        )
      },
    })
  }

  return (
    <section className="animate-fc-in flex h-[calc(100dvh-220px)] flex-col lg:h-[calc(100vh-150px)]">
      <MessageList messages={messages} onSelectCitation={setCitationOpen} />
      <SuggestedQuestions questions={SUGGESTIONS} onSelect={handleSend} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
      <CitationPanel citation={citationOpen} onClose={() => setCitationOpen(null)} />
    </section>
  )
}
