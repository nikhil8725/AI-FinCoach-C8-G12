import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '../ui/Button'

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void
  onSample: () => void
  busy: boolean
}

export function UploadDropzone({ onFiles, onSample, busy }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-10 text-center transition-colors"
      style={{
        borderColor: dragOver ? '#FF6B35' : '#E5E7EB',
        background: dragOver ? 'rgba(255,107,53,0.05)' : 'transparent',
      }}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand/10">
        <UploadCloud size={30} className="text-brand" />
      </div>
      <div className="text-lg font-semibold">Drag &amp; drop your documents</div>
      <div className="mt-1 text-[13.5px] font-medium text-ink-faint">
        Bank statement, salary slip, credit card &amp; loan details
      </div>
      <div className="mt-4 flex gap-2">
        {['CSV', 'PDF', 'XLSX'].map((ext) => (
          <span key={ext} className="rounded-xl bg-bg px-3 py-1 text-xs font-semibold text-ink-soft">
            {ext}
          </span>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.pdf,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
        <Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onSample}>
          {busy ? 'Loading…' : 'or try sample data'}
        </Button>
      </div>
    </div>
  )
}
