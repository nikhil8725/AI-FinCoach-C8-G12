import type { ReactNode } from 'react'
import clsx from 'clsx'

interface PillProps {
  color: string
  tint: string
  children: ReactNode
  dotted?: boolean
  className?: string
}

export function Pill({ color, tint, children, dotted = true, className }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold',
        className,
      )}
      style={{ background: tint, color }}
    >
      {dotted && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  )
}
