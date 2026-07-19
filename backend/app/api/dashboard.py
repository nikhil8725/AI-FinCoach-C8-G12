"""GET /api/dashboard — KPIs, cash flow, category split, debts, insights, health score.

Computed live from the current Transaction/Debt tables via finance/metrics.py (never cached),
except insights and the health-score breakdown, which come from the latest completed
AnalysisRun (they're LLM-narrated and Python-scored once per analysis run, not per page load).

`period` controls how many trailing months (counted from the latest month present in the data,
not literally today's calendar month — uploaded statements are always historical) feed the KPIs,
cash flow chart, category split, and recent activities. Debts/accounts/insights/health score are
current-state, not period-based, so they're unaffected by it.
"""

import json
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.finance.metrics import (
    TxnSummary,
    last_n_months,
    month_key,
    months_in,
    savings_rate,
    window_cashflow_series,
    window_category_split,
    window_income,
    window_spend,
)
from app.models import AnalysisRun, Debt, Document, Insight, Transaction
from app.schemas import (
    AccountSummary,
    CashFlowPoint,
    CategorySplitItem,
    DashboardResponse,
    DebtOut,
    EvidenceItem,
    HealthBreakdown,
    InsightOut,
    KPIs,
    TransactionOut,
)

router = APIRouter(tags=["dashboard"])

RANGE_MONTHS: dict[str, int] = {"1m": 1, "3m": 3, "6m": 6, "12m": 12}


def _latest_balance_for_doc(db: Session, doc_id: str) -> float | None:
    txn = (
        db.query(Transaction)
        .filter(Transaction.document_id == doc_id, Transaction.balance_after.isnot(None))
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .first()
    )
    return txn.balance_after if txn else None


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    period: Literal["1m", "3m", "6m", "12m"] = "1m", db: Session = Depends(get_db)
) -> DashboardResponse:
    transactions = db.query(Transaction).all()
    debts = db.query(Debt).all()
    documents = db.query(Document).filter(Document.status == "parsed").all()

    summaries = [
        TxnSummary(t.date, t.amount, t.txn_type, t.category, t.merchant) for t in transactions
    ]
    all_months = months_in(summaries)
    window = last_n_months(all_months, RANGE_MONTHS[period])
    window_set = set(window)

    income = window_income(summaries, window)
    spend = window_spend(summaries, window)
    total_debt = sum(d.principal_balance for d in debts)

    kpis = KPIs(
        monthly_income=income,
        monthly_spend=spend,
        total_debt=total_debt,
        savings_rate=savings_rate(income, spend),
    )

    accounts: list[AccountSummary] = []
    for doc in documents:
        if doc.doc_type == "bank_statement":
            balance = _latest_balance_for_doc(db, doc.id)
            accounts.append(
                AccountSummary(
                    document_id=doc.id,
                    name=doc.filename,
                    account_type="bank",
                    balance=balance or 0.0,
                )
            )
    for d in debts:
        accounts.append(
            AccountSummary(
                document_id=d.document_id or "",
                name=d.name,
                account_type=d.debt_type,
                balance=-d.principal_balance,
            )
        )

    cash_flow = [CashFlowPoint(**pt) for pt in window_cashflow_series(summaries, window)]
    cat_split = [CategorySplitItem(**c) for c in window_category_split(summaries, window)]

    debts_out = [
        DebtOut(
            id=d.id,
            name=d.name,
            debt_type=d.debt_type,
            principal_balance=d.principal_balance,
            apr=d.apr,
            minimum_payment=d.minimum_payment,
            paid_pct=0.0,  # no repayment history is tracked against the original balance yet
        )
        for d in debts
    ]

    latest_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.status == "complete")
        .order_by(AnalysisRun.completed_at.desc())
        .first()
    )
    insights_out: list[InsightOut] = []
    health = HealthBreakdown(
        total=0, debt_load=0, emergency_fund=0, savings_rate=0, spending_discipline=0, notes={}
    )
    if latest_run:
        rows = (
            db.query(Insight)
            .filter(Insight.analysis_run_id == latest_run.id)
            .order_by(Insight.id)
            .all()
        )
        insights_out = [
            InsightOut(
                id=i.id,
                agent=i.agent,
                title=i.title,
                body=i.body,
                evidence=[EvidenceItem(**e) for e in json.loads(i.evidence_json)],
                severity=i.severity,
            )
            for i in rows
        ]
        if latest_run.health_breakdown_json:
            health = HealthBreakdown(**json.loads(latest_run.health_breakdown_json))

    recent = sorted(
        (t for t in transactions if month_key(t.date) in window_set),
        key=lambda t: (t.date, t.id),
        reverse=True,
    )[:10]
    recent_out = [
        TransactionOut(
            id=t.id,
            date=t.date,
            description=t.description,
            merchant=t.merchant,
            amount=t.amount,
            txn_type=t.txn_type,
            category=t.category,
        )
        for t in recent
    ]

    return DashboardResponse(
        kpis=kpis,
        accounts=accounts,
        cash_flow=cash_flow,
        category_split=cat_split,
        debts=debts_out,
        insights=insights_out,
        health_score=health,
        recent_transactions=recent_out,
    )
