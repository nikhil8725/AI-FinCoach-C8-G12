"""POST /api/chat — routed, grounded, streaming coach answers with citations.
GET /api/chat/messages — history reload on navigation/refresh.
"""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.coach import (
    answer_stream,
    build_answer_prompt,
    resolve_citations,
    retrieve_context,
    route_intent,
)
from app.db import SessionLocal
from app.logging_config import get_logger
from app.models import ChatMessage
from app.schemas import ChatMessageOut, ChatRequest, Citation

logger = get_logger("chat")

router = APIRouter(prefix="/chat", tags=["chat"])


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def _stream_answer(message: str) -> AsyncGenerator[str, None]:
    logger.info('=== new question: "%s" ===', message)
    db = SessionLocal()
    try:
        db.add(ChatMessage(role="user", content=message))
        db.commit()

        router_result = route_intent(message)
        sources = retrieve_context(db, router_result.intent, router_result.standalone_query)
        system, user = build_answer_prompt(
            router_result.intent, sources, router_result.standalone_query
        )

        full_text = ""
        async for chunk in answer_stream(system, user):
            full_text += chunk
            yield _sse({"token": chunk})

        logger.info(
            'answer (%d chars): "%s%s"',
            len(full_text),
            full_text[:200],
            "…" if len(full_text) > 200 else "",
        )
        citations = resolve_citations(full_text, sources)
        db.add(
            ChatMessage(
                role="assistant",
                content=full_text,
                agent=router_result.intent,
                citations_json=json.dumps(citations),
            )
        )
        db.commit()

        yield _sse({"citations": citations, "agent": router_result.intent})
    finally:
        db.close()


@router.post("")
def send_message(body: ChatRequest) -> StreamingResponse:
    return StreamingResponse(_stream_answer(body.message), media_type="text/event-stream")


@router.get("/messages", response_model=list[ChatMessageOut])
def list_messages() -> list[ChatMessageOut]:
    db = SessionLocal()
    try:
        rows = db.query(ChatMessage).order_by(ChatMessage.id).all()
        return [
            ChatMessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                agent=m.agent,
                citations=[Citation(**c) for c in json.loads(m.citations_json)]
                if m.citations_json
                else [],
                created_at=m.created_at,
            )
            for m in rows
        ]
    finally:
        db.close()
