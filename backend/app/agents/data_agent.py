"""Data Agent: aggregates already-ingested transactions/debts into the compact summary that
every downstream agent reads. Column-mapping, categorization, and debt extraction happen at
upload time (app/api/documents.py) — the design's onboarding flow uploads and confirms parsing
*before* the user clicks "Run analysis", so re-parsing here would be redundant work and would
hide parse failures until the analysis run instead of surfacing them immediately on upload.
"""

from app.agents._util import make_event, start_timer
from app.agents.state import GraphState
from app.db import SessionLocal
from app.finance.metrics import (
    TxnSummary,
    category_split,
    detect_recurring_subscriptions,
    essential_monthly_spend,
    monthly_cashflow_series,
    monthly_income,
    monthly_spend,
    months_in,
    needs_wants_savings_split,
)
from app.logging_config import get_logger
from app.models import Debt, Document, Transaction

logger = get_logger("data_agent")


def _build_summary(transactions: list[Transaction]) -> dict:
    if not transactions:
        return {
            "months": [],
            "latest_month": None,
            "monthly_income": 0.0,
            "monthly_spend": 0.0,
            "surplus": 0.0,
            "essential_spend": 0.0,
            "needs_pct": 0.0,
            "wants_pct": 0.0,
            "savings_pct": 0.0,
            "category_split": [],
            "cashflow": [],
            "subscriptions": [],
            "latest_bank_balance": None,
            "txn_count": 0,
        }

    summaries = [
        TxnSummary(t.date, t.amount, t.txn_type, t.category, t.merchant) for t in transactions
    ]
    months = months_in(summaries)
    latest_month = months[-1]

    avg_income = sum(monthly_income(summaries, m) for m in months) / len(months)
    avg_spend = sum(monthly_spend(summaries, m) for m in months) / len(months)
    avg_essential = sum(essential_monthly_spend(summaries, m) for m in months) / len(months)
    split = needs_wants_savings_split(summaries, latest_month)
    subs = detect_recurring_subscriptions(summaries)

    bank_txns = sorted(
        (t for t in transactions if t.balance_after is not None), key=lambda t: (t.date, t.id)
    )
    latest_bank_balance = bank_txns[-1].balance_after if bank_txns else None

    return {
        "months": months,
        "latest_month": latest_month,
        "monthly_income": round(avg_income, 2),
        "monthly_spend": round(avg_spend, 2),
        "surplus": round(avg_income - avg_spend, 2),
        "essential_spend": round(avg_essential, 2),
        "needs_pct": split.needs_pct,
        "wants_pct": split.wants_pct,
        "savings_pct": split.savings_pct,
        "category_split": category_split(summaries, latest_month),
        "cashflow": monthly_cashflow_series(summaries),
        "subscriptions": [
            {
                "merchant": s.merchant,
                "monthly_amount": s.monthly_amount,
                "months_seen": s.months_seen,
                "growth_pct": s.growth_pct,
            }
            for s in subs
        ],
        "latest_bank_balance": latest_bank_balance,
        "txn_count": len(transactions),
    }


def run(state: GraphState) -> dict:
    start = start_timer()
    logger.info("run started (analysis_run_id=%s)", state.get("analysis_run_id"))
    db = SessionLocal()
    try:
        transactions = db.query(Transaction).all()
        debts = db.query(Debt).all()
        parsed_doc_count = db.query(Document).filter(Document.status == "parsed").count()

        if not transactions and not debts:
            logger.warning("no transactions or debts in the database — nothing to analyze")
            return {
                "transactions_summary": {},
                "debts": [],
                "events": [
                    make_event(
                        "data_agent",
                        "error",
                        "No parsed documents found — upload a statement first.",
                        start,
                    )
                ],
                "errors": ["No transactions or debts available for analysis."],
            }

        summary = _build_summary(transactions)
        debts_list = [
            {
                "id": d.id,
                "name": d.name,
                "debt_type": d.debt_type,
                "principal_balance": d.principal_balance,
                "apr": d.apr,
                "minimum_payment": d.minimum_payment,
                "document_id": d.document_id,
            }
            for d in debts
        ]

        message = (
            f"Loaded {len(transactions)} transactions and {len(debts_list)} debts "
            f"from {parsed_doc_count} documents."
        )
        logger.info(
            "summary: %d months, income=Rs.%.0f/mo, spend=Rs.%.0f/mo, surplus=Rs.%.0f/mo, "
            "%d categories, %d subscriptions detected",
            len(summary["months"]),
            summary["monthly_income"],
            summary["monthly_spend"],
            summary["surplus"],
            len(summary["category_split"]),
            len(summary["subscriptions"]),
        )
        logger.info("output -> %s", message)
        return {
            "transactions_summary": summary,
            "debts": debts_list,
            "events": [make_event("data_agent", "done", message, start)],
        }
    finally:
        db.close()
