import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="animate-fc-in fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-full rounded-card-lg bg-surface p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
