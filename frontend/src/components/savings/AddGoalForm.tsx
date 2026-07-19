import { useState } from 'react'
import { Button } from '../ui/Button'
import type { GoalCreate } from '../../types/api'

interface AddGoalFormProps {
  onCancel: () => void
  onCreate: (goal: GoalCreate) => void
  submitting: boolean
}

export function AddGoalForm({ onCancel, onCreate, submitting }: AddGoalFormProps) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const canSubmit = name.trim() !== '' && Number(targetAmount) > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onCreate({
      name: name.trim(),
      target_amount: Number(targetAmount),
      target_date: targetDate || null,
    })
  }

  return (
    <div>
      <div className="text-xl font-bold">Add a savings goal</div>
      <div className="mb-5.5 mt-1 text-[13px] font-medium text-ink-faint">
        Your Savings Strategist will build the monthly plan.
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <div className="mb-1.5 text-xs font-semibold text-ink-soft">Goal name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home down payment"
            className="w-full rounded-2xl border-2 border-border px-3.5 py-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="mb-1.5 text-xs font-semibold text-ink-soft">Target amount</div>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="500000"
              className="w-full rounded-2xl border-2 border-border px-3.5 py-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-xs font-semibold text-ink-soft">Target date</div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-border px-3.5 py-3 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <div className="mt-6.5 flex gap-3">
        <Button variant="ghost" className="flex-1 justify-center" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-1 justify-center" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Creating…' : 'Create goal'}
        </Button>
      </div>
    </div>
  )
}
