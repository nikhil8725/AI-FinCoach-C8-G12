"""Savings Strategist: computes the emergency-fund gap in pure Python, syncs a tracked
"Emergency Fund" Goal row, then makes one LLM call for 3-5 concrete monthly reallocations.
"""

from pydantic import BaseModel

from app.agents._util import make_event, start_timer
from app.agents.state import GraphState
from app.db import SessionLocal
from app.finance.metrics import emergency_fund_target
from app.llm import LLMCallError, call_structured
from app.logging_config import get_logger
from app.models import Goal

logger = get_logger("savings_agent")

EMERGENCY_FUND_GOAL_NAME = "Emergency Fund"


class ReallocationSuggestionLLM(BaseModel):
    from_category: str
    amount: float
    to_goal: str
    rationale: str


class ReallocationBatch(BaseModel):
    suggestions: list[ReallocationSuggestionLLM]


def _fallback_reallocations(category_split: list[dict], gap: float) -> list[dict]:
    if not category_split or gap <= 0:
        return []
    top = sorted(category_split, key=lambda c: -c["amount"])[:2]
    suggestions = []
    for c in top:
        trim = round(c["amount"] * 0.15, 2)
        if trim <= 0:
            continue
        suggestions.append(
            {
                "from_category": c["category"],
                "amount": trim,
                "to_goal": EMERGENCY_FUND_GOAL_NAME,
                "rationale": (
                    f"Trimming 15% off {c['category']} (₹{c['amount']:,.0f}/mo) "
                    "speeds up your emergency fund."
                ),
            }
        )
    return suggestions


def _generate_reallocations(category_split: list[dict], gap: float, surplus: float) -> list[dict]:
    if not category_split:
        return []
    system = (
        "You are the Savings Strategist. Propose 3-5 concrete monthly reallocations to help close "
        "an emergency-fund gap, referencing real category numbers given. Respond with JSON: "
        '{"suggestions": [{"from_category": str, "amount": number, "to_goal": str, '
        '"rationale": str}]}. Never invent numbers — only use categories and amounts given.'
    )
    user = (
        f"Category spending (monthly): {category_split}\n"
        f"Emergency fund gap remaining: ₹{gap:,.0f}\n"
        f"Current monthly surplus: ₹{surplus:,.0f}"
    )
    try:
        result = call_structured(
            "smart", system, user, ReallocationBatch, temperature=0.4, agent="savings_agent"
        )
        suggestions = [s.model_dump() for s in result.suggestions]
        logger.info("LLM proposed %d reallocation(s): %s", len(suggestions), suggestions)
        return suggestions
    except LLMCallError:
        suggestions = _fallback_reallocations(category_split, gap)
        logger.info("LLM unavailable, rule-based reallocation(s): %s", suggestions)
        return suggestions


def _sync_emergency_fund_goal(db, target: float, current: float) -> None:
    goal = db.query(Goal).filter(Goal.name == EMERGENCY_FUND_GOAL_NAME).first()
    if goal is None:
        db.add(
            Goal(
                name=EMERGENCY_FUND_GOAL_NAME,
                target_amount=target,
                current_amount=current,
                status="on_track" if current >= target * 0.5 else "off_track",
            )
        )
    else:
        goal.target_amount = target
        goal.current_amount = max(goal.current_amount, current)
        if goal.current_amount >= target:
            goal.status = "completed"
        elif goal.current_amount >= target * 0.5:
            goal.status = "on_track"
        else:
            goal.status = "off_track"
    db.commit()


def run(state: GraphState) -> dict:
    start = start_timer()
    logger.info("run started")
    summary = state.get("transactions_summary", {})
    essential_spend = summary.get("essential_spend", 0.0)
    surplus = max(0.0, summary.get("surplus", 0.0))
    current = max(0.0, summary.get("latest_bank_balance") or 0.0)

    target = emergency_fund_target(essential_spend)
    gap = max(0.0, target - current)
    runway_months = round(current / essential_spend, 1) if essential_spend > 0 else 0.0
    logger.info(
        "essential_spend=Rs.%.0f/mo, target=Rs.%.0f (6mo), current=Rs.%.0f, "
        "gap=Rs.%.0f, runway=%.1f months",
        essential_spend,
        target,
        current,
        gap,
        runway_months,
    )

    db = SessionLocal()
    try:
        _sync_emergency_fund_goal(db, target, current)
    finally:
        db.close()

    reallocations = _generate_reallocations(summary.get("category_split", []), gap, surplus)

    savings_output = {
        "target": round(target, 2),
        "current": round(current, 2),
        "gap": round(gap, 2),
        "runway_months": runway_months,
        "months_target": 6,
        "reallocations": reallocations,
    }

    message = f"Emergency fund at {runway_months} / 6 months · runway gap ₹{gap:,.0f}"
    insight = {
        "agent": "savings_agent",
        "title": "Emergency fund status",
        "body": message,
        "evidence": [],
        "severity": "warning" if runway_months < 3 else "info",
    }

    logger.info("output -> %s", message)
    return {
        "savings_output": savings_output,
        "events": [make_event("savings_agent", "done", message, start)],
        "insights": [insight],
    }
