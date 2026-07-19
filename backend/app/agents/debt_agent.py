"""Debt Analyzer: runs the pure-Python payoff simulator (never an LLM) for both strategies at
extra=0 and extra=10% of monthly surplus, then makes exactly one LLM call to narrate the result.
"""

from pydantic import BaseModel

from app.agents._util import make_event, start_timer
from app.agents.state import GraphState
from app.db import SessionLocal
from app.finance.debt_math import DebtSnapshot, PayoffResult, simulate_payoff
from app.llm import LLMCallError, call_structured
from app.logging_config import get_logger
from app.models import Document

logger = get_logger("debt_agent")


class DebtNarrative(BaseModel):
    narrative: str


def _payoff_to_dict(result: PayoffResult) -> dict:
    return {
        "strategy": result.strategy,
        "debt_free_month": result.debt_free_month,
        "total_interest_paid": result.total_interest_paid,
        "interest_saved": result.interest_saved,
    }


def _fallback_narrative(debts: list[dict], avalanche: PayoffResult, extra: float) -> str:
    if not debts:
        return "You have no outstanding debts — nothing to analyze here."
    highest_apr = max(debts, key=lambda d: d["apr"])
    return (
        f"Paying an extra ₹{extra:,.0f}/month toward your {highest_apr['name']} "
        f"({highest_apr['apr']:.0f}% APR) first clears all debts in "
        f"{avalanche.debt_free_month} months and saves ₹{avalanche.interest_saved:,.0f} "
        f"in interest versus paying only the minimums."
    )


def _generate_narrative(
    debts: list[dict], avalanche: PayoffResult, snowball: PayoffResult, extra: float
) -> str:
    system = (
        "You are the Debt Analyzer, a persona inside a personal finance coach app. Write a short "
        "(2-3 sentence) narrative explaining the debt payoff plan. Use ONLY the numbers given — "
        'never invent or round differently than provided. Respond with JSON: {"narrative": str}.'
    )
    user = (
        f"Debts: {debts}\n"
        f"Avalanche plan at extra ₹{extra:,.0f}/month: debt-free in "
        f"{avalanche.debt_free_month} months, "
        f"total interest ₹{avalanche.total_interest_paid:,.0f}, interest saved vs minimums "
        f"₹{avalanche.interest_saved:,.0f}.\n"
        f"Snowball plan at the same extra payment: debt-free in {snowball.debt_free_month} months, "
        f"total interest ₹{snowball.total_interest_paid:,.0f}."
    )
    try:
        result = call_structured(
            "smart", system, user, DebtNarrative, temperature=0.4, agent="debt_agent"
        )
        logger.info("LLM narrative: %s", result.narrative)
        return result.narrative
    except LLMCallError:
        narrative = _fallback_narrative(debts, avalanche, extra)
        logger.info("LLM unavailable, rule-based narrative: %s", narrative)
        return narrative


def run(state: GraphState) -> dict:
    start = start_timer()
    logger.info("run started")
    debts_data = state.get("debts", [])

    if not debts_data:
        logger.info("no debts — skipping simulation")
        return {
            "debt_output": {
                "debts": [],
                "extra_10pct": 0.0,
                "avalanche": None,
                "snowball": None,
                "narrative": "You have no outstanding debts — you're debt-free!",
            },
            "events": [
                make_event("debt_agent", "done", "No debts found — you're debt-free.", start)
            ],
        }

    snapshots = [
        DebtSnapshot(
            id=d["id"],
            name=d["name"],
            balance=d["principal_balance"],
            apr=d["apr"],
            minimum_payment=d["minimum_payment"],
        )
        for d in debts_data
    ]
    summary = state.get("transactions_summary", {})
    surplus = max(0.0, summary.get("surplus", 0.0))
    extra_10pct = round(surplus * 0.10, 2)

    avalanche_0 = simulate_payoff(snapshots, 0.0, "avalanche")
    avalanche_extra = simulate_payoff(snapshots, extra_10pct, "avalanche")
    snowball_0 = simulate_payoff(snapshots, 0.0, "snowball")
    snowball_extra = simulate_payoff(snapshots, extra_10pct, "snowball")
    logger.info(
        "simulated %d debts, extra=Rs.%.0f/mo -> avalanche debt-free in %d mo "
        "(saves Rs.%.0f interest), snowball debt-free in %d mo (saves Rs.%.0f interest)",
        len(snapshots),
        extra_10pct,
        avalanche_extra.debt_free_month,
        avalanche_extra.interest_saved,
        snowball_extra.debt_free_month,
        snowball_extra.interest_saved,
    )

    narrative = _generate_narrative(debts_data, avalanche_extra, snowball_extra, extra_10pct)

    debt_output = {
        "debts": debts_data,
        "extra_10pct": extra_10pct,
        "avalanche": {
            "extra_0": _payoff_to_dict(avalanche_0),
            "extra_10pct": _payoff_to_dict(avalanche_extra),
        },
        "snowball": {
            "extra_0": _payoff_to_dict(snowball_0),
            "extra_10pct": _payoff_to_dict(snowball_extra),
        },
        "narrative": narrative,
    }

    total_debt = sum(d["principal_balance"] for d in debts_data)
    max_apr_debt = max(debts_data, key=lambda d: d["apr"])
    message = (
        f"{len(debts_data)} debts · total ₹{total_debt:,.0f} · highest APR "
        f"{max_apr_debt['apr']:.0f}% ({max_apr_debt['name']})"
    )

    db = SessionLocal()
    try:
        doc_names = {d.id: d.filename for d in db.query(Document).all()}
    finally:
        db.close()
    evidence = [
        {
            "source_file": doc_names.get(d.get("document_id"), "unknown"),
            "row_ids": [d["id"]],
            "snippet": f"{d['name']} — ₹{d['principal_balance']:,.0f} at {d['apr']:.0f}% APR",
        }
        for d in debts_data
    ]

    insight = {
        "agent": "debt_agent",
        "title": "Debt payoff plan",
        "body": narrative,
        "evidence": evidence,
        "severity": "warning" if max_apr_debt["apr"] > 30 else "info",
    }

    logger.info("output -> %s", message)
    return {
        "debt_output": debt_output,
        "events": [make_event("debt_agent", "done", message, start)],
        "insights": [insight],
    }
