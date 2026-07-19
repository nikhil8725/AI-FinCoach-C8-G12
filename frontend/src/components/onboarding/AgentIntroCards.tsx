import { LayoutGrid, CreditCard, PiggyBank, Wallet } from 'lucide-react'
import { agentColors, tint } from '../../theme/tokens'

const AGENTS = [
  { key: 'data', name: 'Data Agent', job: 'Reads every statement and turns messy rows into clean, categorized transactions.', icon: LayoutGrid },
  { key: 'debt', name: 'Debt Analyzer', job: 'Simulates avalanche vs. snowball payoff plans and finds the fastest debt-free date.', icon: CreditCard },
  { key: 'savings', name: 'Savings Strategist', job: 'Sizes your emergency fund and proposes monthly reallocations toward your goals.', icon: PiggyBank },
  { key: 'budget', name: 'Budget Advisor', job: 'Checks your 50/30/20 split and flags overspending and creeping subscriptions.', icon: Wallet },
] as const

export function AgentIntroCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {AGENTS.map((a) => {
        const Icon = a.icon
        const color = agentColors[a.key]
        return (
          <div
            key={a.key}
            className="rounded-card-lg bg-surface p-6 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <div
              className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl"
              style={{ background: tint(color, 0.1), width: 52, height: 52 }}
            >
              <Icon size={24} color={color} />
            </div>
            <div className="text-base font-bold">{a.name}</div>
            <div className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-ink-soft">{a.job}</div>
          </div>
        )
      })}
    </div>
  )
}
