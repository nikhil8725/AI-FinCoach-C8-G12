interface DonutSegment {
  color: string
  pct: number
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({ segments, size = 150, strokeWidth = 22, centerLabel, centerValue }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference
          const offset = -((cumulative / 100) * circumference)
          cumulative += seg.pct
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={offset}
            />
          )
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <div className="text-[11px] font-semibold text-ink-faint">{centerLabel}</div>}
          {centerValue && <div className="text-lg font-bold">{centerValue}</div>}
        </div>
      )}
    </div>
  )
}
