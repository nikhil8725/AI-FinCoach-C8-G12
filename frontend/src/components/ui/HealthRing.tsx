interface HealthRingProps {
  score: number
  size?: number
  strokeWidth?: number
  color: string
  label?: string
}

export function HealthRing({ score, size = 46, strokeWidth = 5, color, label }: HealthRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EFF1F4"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ color, fontSize: size * 0.33 }}
      >
        {label ?? score}
      </div>
    </div>
  )
}
