import clsx from 'clsx'

interface ProgressBarProps {
  pct: number
  color: string
  striped?: boolean
  height?: number
}

export function ProgressBar({ pct, color, striped = false, height = 7 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-border-subtle"
      style={{ height }}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-400 ease-out', striped && 'animate-[fc-stripe_1s_linear_infinite]')}
        style={{
          width: `${clamped}%`,
          background: color,
          backgroundImage: striped
            ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 16px)'
            : undefined,
          backgroundSize: striped ? '40px 40px' : undefined,
        }}
      />
    </div>
  )
}
