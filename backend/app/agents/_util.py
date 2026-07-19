"""Small shared helpers for building AgentEvent entries — not a node itself."""

import time

from app.agents.state import AgentEvent


def start_timer() -> float:
    return time.monotonic()


def make_event(agent: str, status: str, message: str, start: float | None = None) -> AgentEvent:
    duration_ms = int((time.monotonic() - start) * 1000) if start is not None else None
    return AgentEvent(agent=agent, status=status, message=message, duration_ms=duration_ms)
