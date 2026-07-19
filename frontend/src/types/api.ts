/** Mirrors backend/app/schemas.py 1:1. Keep both in sync when either changes. */

export type AgentKey = 'data' | 'debt' | 'savings' | 'budget'

export interface HealthResponse {
  ok: boolean
}

export interface ErrorEnvelope {
  error: { code: string; message: string }
}

// --- Documents ---

export interface DocumentUploadResponse {
  doc_id: string
  filename: string
  status: string
}

export interface DocumentOut {
  id: string
  filename: string
  file_type: string
  doc_type: string | null
  status: string
  uploaded_at: string
  txn_count: number
  parse_warning: string | null
}

// --- Analysis SSE ---

export interface AnalysisEvent {
  agent: string
  status: 'running' | 'done' | 'error'
  message: string
  duration_ms: number | null
}

export interface AnalysisCompleteEvent {
  status: 'complete'
  health_score: number
  analysis_run_id: string
}

// --- Shared ---

export interface EvidenceItem {
  source_file: string
  row_ids: number[]
  snippet: string
}

// --- Dashboard ---

export interface KPIs {
  monthly_income: number
  monthly_spend: number
  total_debt: number
  savings_rate: number
}

export interface AccountSummary {
  document_id: string
  name: string
  account_type: string
  balance: number
}

export interface CashFlowPoint {
  month: string
  income: number
  spend: number
}

export interface CategorySplitItem {
  category: string
  amount: number
  pct: number
}

export interface DebtOut {
  id: number
  name: string
  debt_type: string
  principal_balance: number
  apr: number
  minimum_payment: number
  paid_pct: number
}

export interface InsightOut {
  id: number
  agent: string
  title: string
  body: string
  evidence: EvidenceItem[]
  severity: string | null
}

export interface HealthBreakdown {
  total: number
  debt_load: number
  emergency_fund: number
  savings_rate: number
  spending_discipline: number
  notes: Record<string, string>
}

export interface TransactionOut {
  id: number
  date: string
  description: string
  merchant: string | null
  amount: number
  txn_type: 'credit' | 'debit'
  category: string
}

export interface DashboardResponse {
  kpis: KPIs
  accounts: AccountSummary[]
  cash_flow: CashFlowPoint[]
  category_split: CategorySplitItem[]
  debts: DebtOut[]
  insights: InsightOut[]
  health_score: HealthBreakdown
  recent_transactions: TransactionOut[]
}

export interface TransactionListResponse {
  items: TransactionOut[]
  total: number
  page: number
  page_size: number
}

// --- Debt plan ---

export interface MonthEntry {
  month_index: number
  date: string
  total_remaining: number
  per_debt: Array<{ debt_id: number; name: string; remaining_balance: number; payment: number; interest_accrued: number }>
}

export interface PayoffSummary {
  strategy: 'avalanche' | 'snowball'
  debt_free_date: string
  total_interest_paid: number
  interest_saved: number
  timeline: Array<{ month_index: number; total_remaining: number }>
}

export interface DebtPlanResponse {
  strategy: string
  extra_monthly: number
  selected: PayoffSummary
  selected_schedule: MonthEntry[]
  comparison: PayoffSummary
  monthly_payment_limit: { used: number; limit: number }
  narrative: string
}

// --- Savings ---

export interface EmergencyFundStatus {
  current: number
  target: number
  months_target: number
  runway_months: number
}

export interface GoalOut {
  id: number
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_contribution: number | null
  status: 'on_track' | 'off_track' | 'completed'
}

export interface GoalCreate {
  name: string
  target_amount: number
  target_date?: string | null
  monthly_contribution?: number | null
}

export interface ReallocationSuggestion {
  from_category: string
  amount: number
  to_goal: string
  rationale: string
}

export interface SavingsResponse {
  emergency_fund: EmergencyFundStatus
  goals: GoalOut[]
  reallocations: ReallocationSuggestion[]
}

// --- Budget ---

export interface SplitPct {
  needs: number
  wants: number
  savings: number
}

export interface CategoryCapOut {
  category: string
  cap_amount: number
  actual_amount: number
  status: 'ok' | 'warning' | 'over'
}

export interface BudgetAlert {
  type: string
  message: string
  merchant: string | null
  evidence: EvidenceItem[]
}

export interface BudgetResponse {
  actual_split: SplitPct
  target_split: SplitPct
  over_target: string[]
  category_caps: CategoryCapOut[]
  alerts: BudgetAlert[]
}

export interface CategoryCapUpdate {
  cap_amount: number
}

// --- Chat ---

export interface ChatRequest {
  message: string
}

export interface Citation {
  id: number
  source_file: string
  row_range: string | null
  section: string | null
  snippet: string
}

export interface ChatFinalEvent {
  citations: Citation[]
  agent: string
}

export interface ChatMessageOut {
  id: number
  role: 'user' | 'assistant'
  content: string
  agent: string | null
  citations: Citation[]
  created_at: string
}
