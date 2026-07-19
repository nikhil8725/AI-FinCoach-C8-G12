"""Budget Advisor: computes the actual 50/30/20 split and subscription growth in pure Python
(via metrics.py, already summarized by the Data Agent), then makes one LLM call for category
caps and three prioritized insights.
"""

from typing import Literal

from pydantic import BaseModel

from app.agents._util import make_event, start_timer
from app.agents.state import GraphState
from app.db import SessionLocal
from app.finance.metrics import NEEDS_CATEGORIES
from app.llm import LLMCallError, call_structured
from app.logging_config import get_logger
from app.models import BudgetCap, Document, Transaction

logger = get_logger("budget_agent")

TARGET_NEEDS_PCT = 50.0
TARGET_WANTS_PCT = 30.0
TARGET_SAVINGS_PCT = 20.0


class CategoryCapLLM(BaseModel):
    category: str
    cap_amount: float


class PrioritizedInsightLLM(BaseModel):
    title: str
    body: str
    severity: Literal["info", "warning", "success"] = "info"


class BudgetAnalysis(BaseModel):
    category_caps: list[CategoryCapLLM]
    insights: list[PrioritizedInsightLLM]


def _fallback_caps(category_split: list[dict]) -> list[dict]:
    caps = []
    for c in category_split:
        factor = 1.0 if c["category"] in NEEDS_CATEGORIES else 0.85
        caps.append({"category": c["category"], "cap_amount": round(c["amount"] * factor, 2)})
    return caps


def _fallback_insights(summary: dict, category_split: list[dict]) -> list[dict]:
    insights: list[dict] = []
    wants_pct = summary.get("wants_pct", 0.0)
    over = wants_pct - TARGET_WANTS_PCT

    insights.append(
        {
            "title": "50/30/20 split",
            "body": (
                f"Your split is {summary.get('needs_pct', 0):.0f}% needs / "
                f"{wants_pct:.0f}% wants / {summary.get('savings_pct', 0):.0f}% savings, "
                "vs the 50/30/20 target."
            ),
            "severity": "warning" if over > 0 else "success",
        }
    )

    if category_split:
        top = category_split[0]
        insights.append(
            {
                "title": f"Biggest category: {top['category']}",
                "body": (
                    f"{top['category'].title()} is your largest spend category at "
                    f"₹{top['amount']:,.0f}/mo ({top['pct']:.0f}% of spend)."
                ),
                "severity": "info",
            }
        )

    subs = summary.get("subscriptions", [])
    growing = [s for s in subs if s["growth_pct"] > 0]
    if growing:
        names = ", ".join(s["merchant"] for s in growing)
        insights.append(
            {
                "title": "Subscriptions creeping up",
                "body": f"{len(growing)} subscription(s) grew month over month: {names}.",
                "severity": "warning",
            }
        )
    else:
        insights.append(
            {
                "title": "Subscriptions stable",
                "body": f"{len(subs)} recurring subscription(s) detected, no unusual growth.",
                "severity": "info",
            }
        )

    return insights[:3]


def _generate_budget_analysis(summary: dict) -> BudgetAnalysis:
    category_split = summary.get("category_split", [])
    system = (
        "You are the Budget Advisor. Given actual monthly category spending, propose a sensible "
        "monthly cap per category and exactly 3 prioritized insights (overspend, subscriptions, "
        "or trends). Use ONLY the numbers given. Respond with JSON: "
        '{"category_caps": [{"category": str, "cap_amount": number}], '
        '"insights": [{"title": str, "body": str, "severity": "info"|"warning"|"success"}]}.'
    )
    user = (
        f"Category spending (monthly): {category_split}\n"
        f"Actual split: needs {summary.get('needs_pct', 0)}%, "
        f"wants {summary.get('wants_pct', 0)}%, "
        f"savings {summary.get('savings_pct', 0)}% (target 50/30/20).\n"
        f"Subscriptions detected: {summary.get('subscriptions', [])}"
    )
    try:
        result = call_structured(
            "smart", system, user, BudgetAnalysis, temperature=0.4, agent="budget_agent"
        )
        logger.info(
            "LLM proposed %d cap(s), %d insight(s): %s",
            len(result.category_caps),
            len(result.insights),
            [i.title for i in result.insights],
        )
        return result
    except LLMCallError:
        result = BudgetAnalysis(
            category_caps=[CategoryCapLLM(**c) for c in _fallback_caps(category_split)],
            insights=[
                PrioritizedInsightLLM(**i) for i in _fallback_insights(summary, category_split)
            ],
        )
        logger.info(
            "LLM unavailable, rule-based %d cap(s), %d insight(s): %s",
            len(result.category_caps),
            len(result.insights),
            [i.title for i in result.insights],
        )
        return result


def _evidence_for_category(db, category: str, month: str | None, limit: int = 3) -> list[dict]:
    """Real source transactions backing the "biggest category" insight — this is what the
    Dashboard's AI Insights accordion expands to show under "Evidence"."""
    query = db.query(Transaction).filter(
        Transaction.category == category, Transaction.txn_type == "debit"
    )
    if month:
        year, mon = int(month[:4]), int(month[5:7])
        query = query.filter(Transaction.date >= f"{year:04d}-{mon:02d}-01")
    rows = query.order_by(Transaction.amount.desc()).limit(limit).all()
    doc_names = {d.id: d.filename for d in db.query(Document).all()}
    return [
        {
            "source_file": doc_names.get(t.document_id, "unknown"),
            "row_ids": [t.id],
            "snippet": f"{t.description} — ₹{t.amount:,.0f} on {t.date.isoformat()}",
        }
        for t in rows
    ]


def _sync_category_caps(db, caps: list[CategoryCapLLM]) -> None:
    """Seeds BudgetCap rows only where the user hasn't already set one — re-runs never clobber
    a manually edited cap."""
    existing = {c.category for c in db.query(BudgetCap).all()}
    for cap in caps:
        if cap.category in existing:
            continue
        db.add(BudgetCap(category=cap.category, cap_amount=cap.cap_amount))
    db.commit()


def run(state: GraphState) -> dict:
    start = start_timer()
    logger.info("run started")
    summary = state.get("transactions_summary", {})

    if not summary.get("category_split"):
        logger.info("no category spending data yet — skipping")
        return {
            "budget_output": {"category_caps": [], "insights": []},
            "events": [
                make_event("budget_agent", "done", "No spending data available yet.", start)
            ],
        }

    analysis = _generate_budget_analysis(summary)
    category_split = summary.get("category_split", [])
    top_category = category_split[0]["category"] if category_split else None

    db = SessionLocal()
    try:
        _sync_category_caps(db, analysis.category_caps)
        top_evidence = (
            _evidence_for_category(db, top_category, summary.get("latest_month"))
            if top_category
            else []
        )
    finally:
        db.close()

    budget_output = {
        "category_caps": [c.model_dump() for c in analysis.category_caps],
        "insights": [i.model_dump() for i in analysis.insights],
    }

    over_target = summary.get("wants_pct", 0) > TARGET_WANTS_PCT
    message = (
        f"Actual split {summary.get('needs_pct', 0):.0f}/{summary.get('wants_pct', 0):.0f}/"
        f"{summary.get('savings_pct', 0):.0f} vs target 50/30/20"
        + (" — wants over target" if over_target else "")
    )

    insights = [
        {
            "agent": "budget_agent",
            "title": i["title"],
            "body": i["body"],
            "evidence": top_evidence if top_category and top_category in i["title"] else [],
            "severity": i["severity"],
        }
        for i in budget_output["insights"]
    ]

    logger.info("output -> %s", message)
    return {
        "budget_output": budget_output,
        "events": [make_event("budget_agent", "done", message, start)],
        "insights": insights,
    }
