"""Shared LangGraph state for the analysis pipeline.

Agents read `transactions_summary`/`debts` (aggregates only) and write to their own dedicated
key — never to each other's raw data. `insights`/`events`/`errors` are written by multiple
parallel branches, so they need `operator.add` reducers or LangGraph raises InvalidUpdateError
on concurrent writes to the same key.
"""

import operator
from typing import Annotated, Literal, TypedDict


class AgentEvent(TypedDict):
    agent: str
    status: Literal["running", "done", "error"]
    message: str
    duration_ms: int | None


class GraphState(TypedDict):
    analysis_run_id: str
    document_ids: list[str]
    transactions_summary: dict
    debts: list[dict]
    debt_output: dict | None
    savings_output: dict | None
    budget_output: dict | None
    insights: Annotated[list[dict], operator.add]
    events: Annotated[list[AgentEvent], operator.add]
    errors: Annotated[list[str], operator.add]
    health_score: dict | None
