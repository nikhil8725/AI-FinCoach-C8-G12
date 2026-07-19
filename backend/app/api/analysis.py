"""POST /api/analyze — runs the LangGraph pipeline and streams SSE progress events."""

import json
from collections.abc import Generator
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.graph import build_graph
from app.agents.state import GraphState
from app.db import SessionLocal
from app.logging_config import get_logger
from app.models import AnalysisRun, Document

logger = get_logger("analyze")

router = APIRouter(tags=["analysis"])

PARALLEL_AGENTS = ("debt_agent", "savings_agent", "budget_agent")


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _run_events(run_id: str) -> Generator[str, None, None]:
    logger.info(
        "### analysis run %s started ### (data_agent -> [debt|savings|budget]_agent -> synth)",
        run_id,
    )
    graph = build_graph()
    initial_state: GraphState = {
        "analysis_run_id": run_id,
        "document_ids": [],
        "transactions_summary": {},
        "debts": [],
        "debt_output": None,
        "savings_output": None,
        "budget_output": None,
        "insights": [],
        "events": [],
        "errors": [],
        "health_score": None,
    }

    yield _sse(
        {
            "agent": "data_agent",
            "status": "running",
            "message": "Parsing documents…",
            "duration_ms": None,
        }
    )

    try:
        for update in graph.stream(initial_state, stream_mode="updates"):
            node_name, partial = next(iter(update.items()))
            for event in partial.get("events", []):
                yield _sse(dict(event))
            if node_name == "data_agent":
                for agent_name in PARALLEL_AGENTS:
                    yield _sse(
                        {
                            "agent": agent_name,
                            "status": "running",
                            "message": "Starting…",
                            "duration_ms": None,
                        }
                    )
    except Exception as err:  # noqa: BLE001 — a failed run must end the stream cleanly, not 500
        logger.exception("### analysis run %s failed ###", run_id)
        db = SessionLocal()
        try:
            run = db.get(AnalysisRun, run_id)
            if run:
                run.status = "error"
            db.commit()
        finally:
            db.close()
        yield _sse(
            {
                "agent": "system",
                "status": "error",
                "message": f"Analysis failed: {err}",
                "duration_ms": None,
            }
        )
        return

    db = SessionLocal()
    try:
        run = db.get(AnalysisRun, run_id)
        health_score = run.health_score if run and run.health_score is not None else 0
    finally:
        db.close()

    logger.info("### analysis run %s complete ### health_score=%s/100", run_id, health_score)
    yield _sse({"status": "complete", "health_score": health_score, "analysis_run_id": run_id})


@router.post("/analyze")
def analyze() -> StreamingResponse:
    run_id = uuid4().hex
    db = SessionLocal()
    try:
        db.add(AnalysisRun(id=run_id, status="running"))
        db.commit()
    finally:
        db.close()

    return StreamingResponse(_run_events(run_id), media_type="text/event-stream")


@router.get("/analyze/latest")
def latest_run() -> dict:
    db = SessionLocal()
    try:
        run = db.query(AnalysisRun).order_by(AnalysisRun.started_at.desc()).first()
        has_documents = db.query(Document).filter(Document.status == "parsed").count() > 0
        if not run:
            return {"status": None, "health_score": None, "has_documents": has_documents}
        return {
            "status": run.status,
            "health_score": run.health_score,
            "analysis_run_id": run.id,
            "has_documents": has_documents,
        }
    finally:
        db.close()
