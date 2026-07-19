"""GET /api/savings — emergency fund status, goals, reallocation suggestions (recomputed live
from current category spend, the same "Python computes" philosophy as /api/debt/plan).
Goal CRUD for the "Add goal" flow.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.finance.metrics import TxnSummary, category_split, months_in
from app.models import Goal, Transaction
from app.schemas import (
    EmergencyFundStatus,
    GoalCreate,
    GoalOut,
    GoalUpdate,
    ReallocationSuggestion,
    SavingsResponse,
)

router = APIRouter(prefix="/savings", tags=["savings"])

EMERGENCY_FUND_GOAL_NAME = "Emergency Fund"


def _goal_status(current: float, target: float) -> str:
    if target <= 0:
        return "off_track"
    if current >= target:
        return "completed"
    return "on_track" if current >= target * 0.5 else "off_track"


def _goal_out(g: Goal) -> GoalOut:
    return GoalOut(
        id=g.id,
        name=g.name,
        target_amount=g.target_amount,
        current_amount=g.current_amount,
        target_date=g.target_date,
        monthly_contribution=g.monthly_contribution,
        status=g.status,
    )


def _reallocation_suggestions(cat_split: list[dict], gap: float) -> list[ReallocationSuggestion]:
    if not cat_split or gap <= 0:
        return []
    top = sorted(cat_split, key=lambda c: -c["amount"])[:3]
    suggestions = []
    for c in top:
        trim = round(c["amount"] * 0.15, 2)
        if trim <= 0:
            continue
        suggestions.append(
            ReallocationSuggestion(
                from_category=c["category"],
                amount=trim,
                to_goal=EMERGENCY_FUND_GOAL_NAME,
                rationale=(
                    f"Trimming 15% off {c['category']} (₹{c['amount']:,.0f}/mo) "
                    "speeds up your emergency fund."
                ),
            )
        )
    return suggestions


def _months_between(today: date, target: date) -> int:
    return max(1, (target.year - today.year) * 12 + (target.month - today.month))


@router.get("", response_model=SavingsResponse)
def get_savings(db: Session = Depends(get_db)) -> SavingsResponse:
    ef_goal = db.query(Goal).filter(Goal.name == EMERGENCY_FUND_GOAL_NAME).first()
    target = ef_goal.target_amount if ef_goal else 0.0
    current = ef_goal.current_amount if ef_goal else 0.0
    essential_monthly = target / 6 if target > 0 else 0.0
    runway_months = round(current / essential_monthly, 1) if essential_monthly > 0 else 0.0

    emergency_fund = EmergencyFundStatus(
        current=current, target=target, months_target=6, runway_months=runway_months
    )

    transactions = db.query(Transaction).all()
    summaries = [
        TxnSummary(t.date, t.amount, t.txn_type, t.category, t.merchant) for t in transactions
    ]
    months = months_in(summaries)
    cat_split = category_split(summaries, months[-1]) if months else []
    gap = max(0.0, target - current)
    reallocations = _reallocation_suggestions(cat_split, gap)

    goals = db.query(Goal).order_by(Goal.id).all()

    return SavingsResponse(
        emergency_fund=emergency_fund,
        goals=[_goal_out(g) for g in goals],
        reallocations=reallocations,
    )


@router.post("/goals", response_model=GoalOut, status_code=201)
def create_goal(body: GoalCreate, db: Session = Depends(get_db)) -> GoalOut:
    monthly = body.monthly_contribution
    if monthly is None and body.target_date:
        months = _months_between(date.today(), body.target_date)
        monthly = round(body.target_amount / months, 2)

    goal = Goal(
        name=body.name,
        target_amount=body.target_amount,
        current_amount=0.0,
        target_date=body.target_date,
        monthly_contribution=monthly,
        status="off_track",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_out(goal)


@router.patch("/goals/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, body: GoalUpdate, db: Session = Depends(get_db)) -> GoalOut:
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(
            status_code=404, detail={"code": "not_found", "message": "Goal not found."}
        )

    for field in ("name", "target_amount", "current_amount", "target_date", "monthly_contribution"):
        value = getattr(body, field)
        if value is not None:
            setattr(goal, field, value)

    goal.status = _goal_status(goal.current_amount, goal.target_amount)
    db.commit()
    db.refresh(goal)
    return _goal_out(goal)


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)) -> None:
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(
            status_code=404, detail={"code": "not_found", "message": "Goal not found."}
        )
    db.delete(goal)
    db.commit()
