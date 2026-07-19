import { useRef, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusPill } from '../components/ui/StatusPill'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import type { DocumentOut, DocumentUploadResponse } from '../types/api'

const extTint: Record<string, { bg: string; color: string }> = {
  csv: { bg: 'rgba(16,185,129,0.10)', color: '#10B981' },
  xlsx: { bg: 'rgba(16,185,129,0.10)', color: '#10B981' },
  pdf: { bg: 'rgba(239,68,68,0.10)', color: '#EF4444' },
  txt: { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'parsed') return 'success'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

export function DocumentsPage() {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: documents, loading, refetch } = useApi<DocumentOut[]>(() => api.get('/documents'), [])

  const handleAdd = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        await api.upload<DocumentUploadResponse>('/documents', file)
      }
      refetch()
    } catch {
      showToast('Upload failed. Please try a different file.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (doc: DocumentOut) => {
    try {
      await api.delete(`/documents/${doc.id}`)
      refetch()
    } catch {
      showToast('Could not delete this document.')
    }
  }

  const rows = documents ?? []
  const warnings = rows.filter((d) => d.parse_warning)

  const columns: Array<DataTableColumn<DocumentOut>> = [
    {
      key: 'name',
      header: 'Document',
      render: (d) => {
        const tint = extTint[d.file_type] ?? extTint.txt
        return (
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[9.5px] font-bold"
              style={{ background: tint.bg, color: tint.color }}
            >
              {d.file_type.toUpperCase()}
            </span>
            <span className="text-[13.5px] font-semibold">{d.filename}</span>
          </div>
        )
      },
    },
    {
      key: 'range',
      header: 'Uploaded',
      render: (d) => <span className="text-[13px] font-medium text-ink-soft">{formatDate(d.uploaded_at)}</span>,
    },
    {
      key: 'txns',
      header: 'Transactions',
      render: (d) => <span className="text-[13px] font-semibold text-ink-soft">{d.txn_count || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      width: '40px',
      render: (d) => (
        <button
          type="button"
          onClick={() => handleDelete(d)}
          className="flex min-h-11 min-w-11 items-center justify-center text-ink-faint hover:text-danger"
          aria-label={`Delete ${d.filename}`}
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ]

  return (
    <section className="animate-fc-in flex flex-col gap-5">
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-bold">Uploaded Documents</div>
            <div className="text-[12.5px] font-medium text-ink-faint">Everything your agents have read</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.pdf,.txt"
            className="hidden"
            onChange={(e) => {
              handleAdd(e.target.files)
              e.target.value = ''
            }}
          />
          <Button variant="dark" disabled={busy} onClick={() => inputRef.current?.click()}>
            <span className="text-base leading-none">+</span> Add document
          </Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-ink-faint">Loading…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            keyField={(d) => d.id}
            emptyLabel="No documents uploaded yet."
            renderCard={(d) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">{d.filename}</div>
                  <div className="text-xs font-medium text-ink-faint">
                    {formatDate(d.uploaded_at)} · {d.txn_count || 0} txns
                  </div>
                </div>
                <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>
              </div>
            )}
          />
        )}
      </Card>

      {warnings.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 rounded-2xl border-[1.5px] border-brand/20 bg-brand/[0.06] px-5 py-4 text-[13px] font-medium text-[#B45309]"
        >
          <AlertTriangle size={17} className="shrink-0 text-[#D97706]" />
          <span>
            <strong className="text-[#92400E]">{d.filename}:</strong> {d.parse_warning}
          </span>
        </div>
      ))}
    </section>
  )
}
