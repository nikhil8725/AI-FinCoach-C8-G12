import { ShieldCheck } from 'lucide-react'
import type { Citation } from '../../types/api'

interface CitationDetailProps {
  citation: Citation
  onClose: () => void
}

/** Content-only component: rendered inside either a SlideOver (desktop) or BottomSheet (mobile)
 * by CitationPanel — the content itself never forks per breakpoint. */
export function CitationDetail({ citation, onClose }: CitationDetailProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[17px] font-bold">Source</div>
        <button
          onClick={onClose}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-bg text-ink-soft hover:bg-[#E9EBEF]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-xl bg-bg px-2.5 py-1.5 font-mono text-xs font-semibold text-[#3B82F6]">
        {citation.source_file}
        {citation.section ? ` · ${citation.section}` : ''}
      </div>

      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        Exact source
      </div>
      <div className="rounded-2xl border border-border-subtle p-4 text-[12.5px] font-medium text-ink-soft" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {citation.snippet || 'No snippet available.'}
        {citation.row_range && <div className="mt-2 font-mono text-[10.5px] text-ink-faint">row ids: {citation.row_range}</div>}
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3.5 text-[12.5px] font-semibold text-successDark" style={{ color: '#059669' }}>
        <ShieldCheck size={15} className="text-success" />
        Verified against your uploaded document
      </div>
    </div>
  )
}
