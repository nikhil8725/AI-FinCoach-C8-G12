import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Single reusable bottom sheet: citation detail, add-goal, table row detail, and filters
 * all render their content inside this on mobile (same content component as the desktop
 * Modal/SlideOver — only the container differs). */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="animate-fc-in fixed inset-0 z-[60] flex items-end bg-ink/45" onClick={onClose}>
      <div
        className="safe-bottom max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] bg-surface p-6 pt-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>
  )
}
