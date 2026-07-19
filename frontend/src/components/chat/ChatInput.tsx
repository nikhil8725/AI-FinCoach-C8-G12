import { useState, type KeyboardEvent } from 'react'
import { Send, ShieldCheck } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="flex-0 pt-2">
      <div className="flex items-center gap-2.5 rounded-full bg-surface p-2 pl-4.5 shadow-card">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach anything…"
          disabled={disabled}
          className="min-h-11 flex-1 bg-transparent text-sm text-ink-soft outline-none disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_12px_rgba(255,107,53,0.32)] hover:bg-brand-hover disabled:opacity-50"
        >
          <Send size={17} />
        </button>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-ink-faint">
        <ShieldCheck size={13} className="text-success" />
        Grounded in your data — every answer cites your documents
      </div>
    </div>
  )
}
