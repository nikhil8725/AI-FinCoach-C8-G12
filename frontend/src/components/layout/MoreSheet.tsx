import { RotateCw, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../ui/BottomSheet'
import { moreSheetOrder, navItems } from './navConfig'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  onRerun: () => void
}

export function MoreSheet({ open, onClose, onRerun }: MoreSheetProps) {
  const navigate = useNavigate()

  const go = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-1">
        {moreSheetOrder.map((key) => {
          const item = navItems[key]
          const Icon = item.icon
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(item.path)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink hover:bg-bg"
            >
              <Icon size={19} className="text-ink-soft" />
              {item.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink hover:bg-bg"
        >
          <Settings size={19} className="text-ink-soft" />
          Settings
        </button>
        <button
          type="button"
          onClick={() => {
            onRerun()
            onClose()
          }}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-brand hover:bg-brand/5"
        >
          <RotateCw size={19} />
          Re-run Analysis
        </button>
      </div>
    </BottomSheet>
  )
}
