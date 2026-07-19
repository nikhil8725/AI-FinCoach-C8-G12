"""Pydantic request/response schemas — the typed boundary for every API route."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    ok: bool


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


# --- Documents ---


class DocumentUploadResponse(BaseModel):
    doc_id: str
    filename: str
    status: str


class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    doc_type: str | None
    status: str
    uploaded_at: datetime
    txn_count: int
    parse_warning: str | None


# --- Analysis SSE ---


class AnalysisEvent(BaseModel):
    agent: str
    status: Literal["running", "done", "error"]
    message: str
    duration_ms: int | None = None


class AnalysisCompleteEvent(BaseModel):
    status: Literal["complete"]
    health_score: int
    analysis_run_id: str


# --- Shared evidence / citation shape ---


class EvidenceItem(BaseModel):
    source_file: str
    row_ids: list[int]
    snippet: str


# --- Dashboard ---


class KPIs(BaseModel):
    monthly_income: float
    monthly_spend: float
    total_debt: float
    savings_rate: float


class AccountSummary(BaseModel):
    document_id: str
    name: str
    account_type: str
    balance: float


class CashFlowPoint(BaseModel):
    month: str
    income: float
    spend: float


class CategorySplitItem(BaseModel):
    category: str
    amount: float
    pct: float


class DebtOut(BaseModel):
    id: int
    name: str
    debt_type: str
    principal_balance: float
    apr: float
    minimum_payment: float
    paid_pct: float


class InsightOut(BaseModel):
    id: int
    agent: str
    title: str
    body: str
    evidence: list[EvidenceItem]
    severity: str | None


class HealthBreakdown(BaseModel):
    total: int
    debt_load: int
    emergency_fund: int
    savings_rate: int
    spending_discipline: int
    notes: dict[str, str]


class TransactionOut(BaseModel):
    id: int
    date: date
    description: str
    merchant: str | None
    amount: float
    txn_type: str
    category: str


class DashboardResponse(BaseModel):
    kpis: KPIs
    accounts: list[AccountSummary]
    cash_flow: list[CashFlowPoint]
    category_split: list[CategorySplitItem]
    debts: list[DebtOut]
    insights: list[InsightOut]
    health_score: HealthBreakdown
    recent_transactions: list[TransactionOut]


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int


# --- Debt plan ---


class MonthEntry(BaseModel):
    month_index: int
    date: str
    total_remaining: float
    per_debt: list[dict]


class PayoffSummary(BaseModel):
    strategy: Literal["avalanche", "snowball"]
    debt_free_date: str
    total_interest_paid: float
    interest_saved: float
    timeline: list[dict]


class DebtPlanResponse(BaseModel):
    strategy: str
    extra_monthly: float
    selected: PayoffSummary
    selected_schedule: list[MonthEntry]
    comparison: PayoffSummary
    monthly_payment_limit: dict
    narrative: str


# --- Savings ---


class EmergencyFundStatus(BaseModel):
    current: float
    target: float
    months_target: int
    runway_months: float


class GoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: date | None
    monthly_contribution: float | None
    status: str


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: date | None = None
    monthly_contribution: float | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: date | None = None
    monthly_contribution: float | None = None


class ReallocationSuggestion(BaseModel):
    from_category: str
    amount: float
    to_goal: str
    rationale: str


class SavingsResponse(BaseModel):
    emergency_fund: EmergencyFundStatus
    goals: list[GoalOut]
    reallocations: list[ReallocationSuggestion]


# --- Budget ---


class SplitPct(BaseModel):
    needs: float
    wants: float
    savings: float


class CategoryCapOut(BaseModel):
    category: str
    cap_amount: float
    actual_amount: float
    status: Literal["ok", "warning", "over"]


class BudgetAlert(BaseModel):
    type: str
    message: str
    merchant: str | None
    evidence: list[EvidenceItem]


class BudgetResponse(BaseModel):
    actual_split: SplitPct
    target_split: SplitPct
    over_target: list[str]
    category_caps: list[CategoryCapOut]
    alerts: list[BudgetAlert]


class CategoryCapUpdate(BaseModel):
    cap_amount: float


# --- Chat ---


class ChatRequest(BaseModel):
    message: str


class Citation(BaseModel):
    id: int
    source_file: str
    row_range: str | None
    section: str | None
    snippet: str


class ChatFinalEvent(BaseModel):
    citations: list[Citation]
    agent: str


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    agent: str | None
    citations: list[Citation]
    created_at: datetime
