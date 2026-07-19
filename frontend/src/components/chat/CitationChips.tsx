import { FileText } from 'lucide-react'
import type { Citation } from '../../types/api'

interface CitationChipsProps {
  citations: Citation[]
  onSelect: (citation: Citation) => void
}

function chipLabel(c: Citation): string {
  if (c.section && c.row_range) return `${c.source_file} · ${c.section} · rows ${c.row_range}`
  if (c.section) return `${c.source_file} · ${c.section}`
  return c.source_file
}

export function CitationChips({ citations, onSelect }: CitationChipsProps) {
  if (citations.length === 0) return null
  return (
    <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border-subtle pt-3.5">
      {citations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-bg px-2.5 py-1.5 font-mono text-[11.5px] font-semibold text-[#3B82F6] hover:bg-[#E8EAEE]"
        >
          <FileText size={12} />
          {chipLabel(c)}
        </button>
      ))}
    </div>
  )
}
