import type { ReactNode } from 'react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function SlideOver({ open, onClose, children }: SlideOverProps) {
  if (!open) return null
  return (
    <div className="animate-fc-in fixed inset-0 z-[60] bg-ink/35" onClick={onClose}>
      <div
        className="absolute right-0 top-0 flex h-full w-[420px] max-w-[90vw] flex-col bg-surface p-7 shadow-[-8px_0_40px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
