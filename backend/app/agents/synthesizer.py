"""Synthesizer: merges the three specialist outputs, computes the weighted 0-100 health score
(pure Python — no LLM), and persists Insight rows + the AnalysisRun record."""

import json
from datetime import datetime

from app.agents._util import make_event, start_timer
from app.agents.state import GraphState
from app.db import SessionLocal
from app.finance.metrics import (
    compute_health_score,
    debt_load_score,
    emergency_fund_score,
    savings_rate_score,
    spending_discipline_score,
)
from app.logging_config import get_logger
from app.models import AnalysisRun, Insight

logger = get_logger("synthesizer")


def run(state: GraphState) -> dict:
    start = start_timer()
    logger.info("run started — merging debt/savings/budget outputs")
    summary = state.get("transactions_summary", {})
    savings_output = state.get("savings_output") or {}
    debts = state.get("debts", [])

    income = summary.get("monthly_income", 0.0)
    total_min_payments = sum(d["minimum_payment"] for d in debts)
    max_apr = max((d["apr"] for d in debts), default=0.0)

    dl_score = debt_load_score(income, total_min_payments, max_apr)
    ef_score = emergency_fund_score(savings_output.get("runway_months", 0.0))
    sr_score = savings_rate_score(summary.get("savings_pct", 0.0))
    sd_score = spending_discipline_score(summary.get("wants_pct", 0.0))
    total = compute_health_score(dl_score, ef_score, sr_score, sd_score)

    health_score = {
        "total": total,
        "debt_load": dl_score,
        "emergency_fund": ef_score,
        "savings_rate": sr_score,
        "spending_discipline": sd_score,
        "notes": {
            "debt_load": "High-APR debt weighing this down"
            if max_apr > 30
            else "Debt load manageable",
            "emergency_fund": f"{savings_output.get('runway_months', 0)} of 6 months covered",
            "savings_rate": f"{summary.get('savings_pct', 0):.0f}% of income saved",
            "spending_discipline": f"Wants at {summary.get('wants_pct', 0):.0f}% of income",
        },
    }

    logger.info(
        "health score breakdown: total=%d (debt_load=%d, emergency_fund=%d, "
        "savings_rate=%d, spending_discipline=%d)",
        total,
        dl_score,
        ef_score,
        sr_score,
        sd_score,
    )

    db = SessionLocal()
    try:
        run_id = state["analysis_run_id"]
        all_insights = state.get("insights", [])
        logger.info("persisting %d insight(s) for analysis_run_id=%s", len(all_insights), run_id)
        for ins in all_insights:
            db.add(
                Insight(
                    analysis_run_id=run_id,
                    agent=ins["agent"],
                    title=ins.get("title", ""),
                    body=ins["body"],
                    evidence_json=json.dumps(ins.get("evidence", [])),
                    severity=ins.get("severity"),
                )
            )
        analysis_run = db.get(AnalysisRun, run_id)
        if analysis_run:
            analysis_run.status = "complete"
            analysis_run.completed_at = datetime.utcnow()
            analysis_run.health_score = total
            analysis_run.health_breakdown_json = json.dumps(health_score)
        db.commit()
    finally:
        db.close()

    message = f"Health score {total}/100 — plan ready."
    logger.info("output -> %s", message)
    return {
        "health_score": health_score,
        "events": [make_event("synthesizer", "done", message, start)],
    }
