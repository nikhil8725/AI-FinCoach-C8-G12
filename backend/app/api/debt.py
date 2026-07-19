"""GET /api/debt/plan — recomputes the payoff schedule live via debt_math.simulate_payoff for
whatever strategy/extra the slider requests. The narrative is reused from the last debt_agent
Insight, never a fresh LLM call per slider tick.
"""

from datetime import date
from typing import Literal

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.finance.debt_math import DebtSnapshot, PayoffResult, simulate_payoff
from app.models import AnalysisRun, Debt, Insight
from app.schemas import DebtPlanResponse, MonthEntry, PayoffSummary

router = APIRouter(prefix="/debt", tags=["debt"])


def _add_months(base: date, months: int) -> date:
    return base + relativedelta(months=months)


def _to_summary(result: PayoffResult, strategy: str) -> PayoffSummary:
    debt_free_date = _add_months(date.today(), result.debt_free_month)
    return PayoffSummary(
        strategy=strategy,
        debt_free_date=debt_free_date.strftime("%b %Y"),
        total_interest_paid=result.total_interest_paid,
        interest_saved=result.interest_saved,
        timeline=[
            {"month_index": m.month_index, "total_remaining": m.total_remaining}
            for m in result.months
        ],
    )


@router.get("/plan", response_model=DebtPlanResponse)
def get_debt_plan(
    strategy: Literal["avalanche", "snowball"] = "avalanche",
    extra: float = 0.0,
    db: Session = Depends(get_db),
) -> DebtPlanResponse:
    debts = db.query(Debt).all()
    snapshots = [
        DebtSnapshot(
            id=d.id,
            name=d.name,
            balance=d.principal_balance,
            apr=d.apr,
            minimum_payment=d.minimum_payment,
        )
        for d in debts
    ]
    other_strategy: Literal["avalanche", "snowball"] = (
        "snowball" if strategy == "avalanche" else "avalanche"
    )

    selected = simulate_payoff(snapshots, extra, strategy)
    comparison = simulate_payoff(snapshots, extra, other_strategy)

    narrative = "Run an analysis to get a personalized payoff narrative."
    latest_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.status == "complete")
        .order_by(AnalysisRun.completed_at.desc())
        .first()
    )
    if latest_run:
        insight = (
            db.query(Insight)
            .filter(Insight.analysis_run_id == latest_run.id, Insight.agent == "debt_agent")
            .first()
        )
        if insight:
            narrative = insight.body

    total_minimum = sum(d.minimum_payment for d in debts)
    limit = total_minimum + max(0.0, extra)

    selected_schedule = [
        MonthEntry(
            month_index=m.month_index,
            date=_add_months(date.today(), m.month_index).strftime("%b %Y"),
            total_remaining=m.total_remaining,
            per_debt=[
                {
                    "debt_id": pd.debt_id,
                    "name": pd.name,
                    "remaining_balance": pd.remaining_balance,
                    "payment": pd.payment,
                    "interest_accrued": pd.interest_accrued,
                }
                for pd in m.per_debt
            ],
        )
        for m in selected.months
    ]

    return DebtPlanResponse(
        strategy=strategy,
        extra_monthly=extra,
        selected=_to_summary(selected, strategy),
        selected_schedule=selected_schedule,
        comparison=_to_summary(comparison, other_strategy),
        monthly_payment_limit={"used": limit, "limit": limit},
        narrative=narrative,
    )
