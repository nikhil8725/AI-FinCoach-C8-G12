export type PeriodRange = '1m' | '3m' | '6m' | '12m'

const OPTIONS: Array<{ value: PeriodRange; label: string }> = [
  { value: '1m', label: 'Latest month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '12m', label: '1 year' },
]

interface RangeSelectorProps {
  value: PeriodRange
  onChange: (value: PeriodRange) => void
}

/** "Latest month" means the most recent month present in the uploaded data, not literally
 * today's calendar month — uploaded statements are always historical. */
export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-bg p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="min-h-9 rounded-xl px-3.5 text-[12.5px] font-semibold transition-all sm:px-4 sm:text-[13px]"
          style={{
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? '#111827' : '#6B7280',
            boxShadow: value === opt.value ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
