"""OpenRouter client factory and the two call shapes every agent uses:
structured (JSON validated against a Pydantic schema) and streaming text.
"""

import json
import re
import time
from collections.abc import AsyncIterator, Iterable
from datetime import datetime
from typing import Literal, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()

_client: OpenAI | None = None

SchemaT = TypeVar("SchemaT", bound=BaseModel)

CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


class LLMCallError(Exception):
    """Raised when every model + retry attempt fails. Callers must fall back to rule-based logic."""


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1", api_key=settings.openrouter_api_key
        )
    return _client


def _model_for_tier(tier: Literal["fast", "smart"]) -> str:
    return settings.fast_model if tier == "fast" else settings.smart_model


def _log_call(
    *,
    agent: str,
    tier: str,
    model: str,
    latency_ms: int,
    success: bool,
    prompt_chars: int,
    completion_chars: int,
) -> None:
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": agent,
        "tier": tier,
        "model": model,
        "latency_ms": latency_ms,
        "success": success,
        "prompt_chars": prompt_chars,
        "completion_chars": completion_chars,
    }
    with open(f"{settings.log_dir}/llm.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def _strip_code_fence(text: str) -> str:
    return CODE_FENCE_RE.sub("", text.strip()).strip()


def _try_parse(text: str, schema: type[SchemaT]) -> SchemaT:
    data = json.loads(_strip_code_fence(text))
    return schema.model_validate(data)


def _call_once(model: str, system: str, user: str, temperature: float) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    return response.choices[0].message.content or ""


def call_structured(
    model_tier: Literal["fast", "smart"],
    system: str,
    user: str,
    schema: type[SchemaT],
    max_retries: int = 2,
    temperature: float = 0.2,
    agent: str = "unknown",
) -> SchemaT:
    """Calls OpenRouter and validates the JSON response against `schema`.

    Retries the same model up to `max_retries` times, feeding the validation error back so the
    model can self-correct, then falls back to `settings.fallback_model` once before giving up.
    Raises LLMCallError on total failure — callers must have a rule-based fallback path.
    """
    model = _model_for_tier(model_tier)
    attempts: list[tuple[str, str]] = [(model, user)] + [
        (
            model,
            f"{user}\n\nYour previous response was invalid JSON or failed schema validation. "
            f"Return ONLY valid JSON matching the required schema.",
        )
        for _ in range(max_retries)
    ]
    attempts.append((settings.fallback_model, user))

    last_error: Exception | None = None
    for attempt_model, attempt_user in attempts:
        start = time.monotonic()
        try:
            raw = _call_once(attempt_model, system, attempt_user, temperature)
            result = _try_parse(raw, schema)
            _log_call(
                agent=agent,
                tier=model_tier,
                model=attempt_model,
                latency_ms=int((time.monotonic() - start) * 1000),
                success=True,
                prompt_chars=len(system) + len(attempt_user),
                completion_chars=len(raw),
            )
            return result
        except Exception as err:  # noqa: BLE001 — any provider/parse error should fall through to retry/fallback
            _log_call(
                agent=agent,
                tier=model_tier,
                model=attempt_model,
                latency_ms=int((time.monotonic() - start) * 1000),
                success=False,
                prompt_chars=len(system) + len(attempt_user),
                completion_chars=0,
            )
            last_error = err

    raise LLMCallError(f"All LLM attempts failed for agent={agent}: {last_error}")


FALLBACK_ANSWER = (
    "I couldn't reach the language model just now, so I can't answer that in detail. "
    "Please check that OPENROUTER_API_KEY is set and try again."
)


def _stream_once(model: str, system: str, user: str, temperature: float) -> Iterable[str]:
    client = get_client()
    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def stream_text(
    model_tier: Literal["fast", "smart"], system: str, user: str, temperature: float = 0.4
) -> Iterable[str]:
    """Yields response text chunks for SSE token streaming (coach chat answers). Falls back to
    settings.fallback_model on error, then to a static message — a broken provider must degrade
    the chat reply, never crash the SSE stream."""
    for model in (_model_for_tier(model_tier), settings.fallback_model):
        start = time.monotonic()
        produced_any = False
        try:
            for delta in _stream_once(model, system, user, temperature):
                produced_any = True
                yield delta
            _log_call(
                agent="coach",
                tier=model_tier,
                model=model,
                latency_ms=int((time.monotonic() - start) * 1000),
                success=True,
                prompt_chars=len(system) + len(user),
                completion_chars=0,
            )
            return
        except Exception:  # noqa: BLE001 — any provider error must fall through, not crash the stream
            _log_call(
                agent="coach",
                tier=model_tier,
                model=model,
                latency_ms=int((time.monotonic() - start) * 1000),
                success=False,
                prompt_chars=len(system) + len(user),
                completion_chars=0,
            )
            if produced_any:
                return  # partial stream already reached the client; don't retry mid-answer

    yield FALLBACK_ANSWER


async def astream_text(
    model_tier: Literal["fast", "smart"], system: str, user: str, temperature: float = 0.4
) -> AsyncIterator[str]:
    """Async wrapper around stream_text for use inside FastAPI's StreamingResponse."""
    for chunk in stream_text(model_tier, system, user, temperature):
        yield chunk
