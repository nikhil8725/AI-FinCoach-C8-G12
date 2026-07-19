"""GET /api/budget — actual vs. target 50/30/20 split, category caps, subscription alerts.
PATCH /api/budget/caps/{category} — user edits a suggested cap; the Budget Advisor's initial
seed (from budget_agent) is just a starting point, never re-clobbered by later analysis runs.

`period` controls how many trailing months (from the latest month present in the data) feed the
actual split and category totals — same semantics as /api/dashboard's `period`.
"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.finance.metrics import (
    TxnSummary,
    detect_recurring_subscriptions,
    last_n_months,
    months_in,
    window_category_split,
    window_needs_wants_savings_split,
)
from app.models import BudgetCap, Transaction
from app.schemas import BudgetAlert, BudgetResponse, CategoryCapOut, CategoryCapUpdate, SplitPct

router = APIRouter(prefix="/budget", tags=["budget"])

TARGET_SPLIT = SplitPct(needs=50.0, wants=30.0, savings=20.0)
RANGE_MONTHS: dict[str, int] = {"1m": 1, "3m": 3, "6m": 6, "12m": 12}


def _cap_status(actual: float, cap: float) -> str:
    if cap <= 0:
        return "ok"
    if actual > cap:
        return "over"
    if actual > cap * 0.85:
        return "warning"
    return "ok"


def _load_summaries(db: Session) -> list[TxnSummary]:
    transactions = db.query(Transaction).all()
    return [TxnSummary(t.date, t.amount, t.txn_type, t.category, t.merchant) for t in transactions]


def _window_for(summaries: list[TxnSummary], period: str) -> list[str]:
    return last_n_months(months_in(summaries), RANGE_MONTHS[period])


@router.get("", response_model=BudgetResponse)
def get_budget(
    period: Literal["1m", "3m", "6m", "12m"] = "1m", db: Session = Depends(get_db)
) -> BudgetResponse:
    summaries = _load_summaries(db)
    window = _window_for(summaries, period)

    split = window_needs_wants_savings_split(summaries, window)
    actual_split = SplitPct(needs=split.needs_pct, wants=split.wants_pct, savings=split.savings_pct)

    over_target = []
    if actual_split.needs > TARGET_SPLIT.needs:
        over_target.append("needs")
    if actual_split.wants > TARGET_SPLIT.wants:
        over_target.append("wants")

    cat_split = window_category_split(summaries, window)
    actual_by_cat = {c["category"]: c["amount"] for c in cat_split}
    caps = {c.category: c.cap_amount for c in db.query(BudgetCap).all()}

    all_categories = sorted(
        set(actual_by_cat) | set(caps), key=lambda c: -actual_by_cat.get(c, 0.0)
    )
    category_caps = [
        CategoryCapOut(
            category=cat,
            cap_amount=caps.get(cat, 0.0),
            actual_amount=actual_by_cat.get(cat, 0.0),
            status=_cap_status(actual_by_cat.get(cat, 0.0), caps.get(cat, 0.0)),
        )
        for cat in all_categories
    ]

    alerts: list[BudgetAlert] = []
    growing = [s for s in detect_recurring_subscriptions(summaries) if s.growth_pct > 0]
    if growing:
        names = ", ".join(s.merchant for s in growing)
        alerts.append(
            BudgetAlert(
                type="subscription_growth",
                message=f"{len(growing)} subscription(s) grew month over month: {names}.",
                merchant=None,
                evidence=[],
            )
        )

    return BudgetResponse(
        actual_split=actual_split,
        target_split=TARGET_SPLIT,
        over_target=over_target,
        category_caps=category_caps,
        alerts=alerts,
    )


@router.patch("/caps/{category}", response_model=CategoryCapOut)
def update_cap(
    category: str,
    body: CategoryCapUpdate,
    period: Literal["1m", "3m", "6m", "12m"] = "1m",
    db: Session = Depends(get_db),
) -> CategoryCapOut:
    cap = db.query(BudgetCap).filter(BudgetCap.category == category).first()
    if cap:
        cap.cap_amount = body.cap_amount
        cap.updated_at = datetime.utcnow()
    else:
        cap = BudgetCap(category=category, cap_amount=body.cap_amount)
        db.add(cap)
    db.commit()

    summaries = _load_summaries(db)
    window = _window_for(summaries, period)
    actual_by_cat = {c["category"]: c["amount"] for c in window_category_split(summaries, window)}
    actual = actual_by_cat.get(category, 0.0)

    return CategoryCapOut(
        category=category,
        cap_amount=cap.cap_amount,
        actual_amount=actual,
        status=_cap_status(actual, cap.cap_amount),
    )
