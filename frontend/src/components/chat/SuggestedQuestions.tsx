interface SuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="min-h-9 rounded-full border-[1.5px] border-border bg-surface px-4 text-[13px] font-semibold text-ink-soft hover:border-brand hover:text-brand"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
