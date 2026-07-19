import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { DocumentOut } from '../../types/api'
import { colors } from '../../theme/tokens'

interface UploadedFilesListProps {
  documents: DocumentOut[]
}

const extTint: Record<string, { bg: string; color: string }> = {
  csv: { bg: 'rgba(16,185,129,0.10)', color: colors.success },
  xlsx: { bg: 'rgba(16,185,129,0.10)', color: colors.success },
  pdf: { bg: 'rgba(239,68,68,0.10)', color: colors.danger },
  txt: { bg: 'rgba(107,114,128,0.10)', color: colors.inkSoft },
}

function statusIcon(status: string) {
  if (status === 'parsed') return <CheckCircle2 size={18} className="text-success" />
  if (status === 'failed') return <XCircle size={18} className="text-danger" />
  return <Loader2 size={18} className="animate-spin text-ink-faint" />
}

function statusNote(doc: DocumentOut): string {
  if (doc.status === 'failed') return doc.parse_warning ?? 'Failed to parse'
  if (doc.parse_warning) return doc.parse_warning
  if (doc.txn_count > 0) return `${doc.txn_count} transactions`
  return doc.status === 'parsed' ? 'Parsed' : 'Processing…'
}

export function UploadedFilesList({ documents }: UploadedFilesListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Your documents</div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] font-medium text-ink-faint">
          Nothing uploaded yet.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Your documents</div>
      {documents.map((doc) => {
        const ext = doc.file_type
        const tint = extTint[ext] ?? extTint.txt
        return (
          <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold"
              style={{ background: tint.bg, color: tint.color }}
            >
              {ext.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold">{doc.filename}</div>
              <div className="truncate text-xs font-medium text-ink-faint">{statusNote(doc)}</div>
            </div>
            {statusIcon(doc.status)}
          </div>
        )
      })}
    </div>
  )
}
