"""Chunk + embed into Chroma (persistent, local, default embedding function).

Two chunk types share one collection, distinguished by metadata `type`:
- doc_summary: one chunk per document, the data_agent's plain-language summary.
- txn_chunk: one chunk per (document, month, category) — rendered as a small markdown table
  with a contextual header line ("hdfc_statement.csv › 2026-03 › Food — 14 txns, total ₹9,420").
  This header-prefixed chunking is what makes retrieval work on tabular data; naive per-row
  embedding fails for numbers.

Every chunk carries {doc_id, row_ids} metadata so retrieved results can drive citation chips.
"""

import os
from collections import defaultdict

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb  # noqa: E402 — must follow the telemetry env var above

from app.config import get_settings
from app.logging_config import get_logger
from app.models import Transaction

logger = get_logger("rag.indexer")

settings = get_settings()
_client: chromadb.ClientAPI | None = None


def get_collection() -> chromadb.Collection:
    global _client
    first_init = _client is None
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_dir)
    collection = _client.get_or_create_collection("fincoach")
    if first_init:
        embed_fn = getattr(collection, "_embedding_function", None)
        logger.info(
            "Chroma collection 'fincoach' ready at %s — embedding fn=%s, %d chunk(s) indexed",
            settings.chroma_dir,
            type(embed_fn).__name__ if embed_fn else "unknown",
            collection.count(),
        )
    return collection


def index_document_summary(doc_id: str, filename: str, summary: str) -> None:
    if not summary:
        return
    get_collection().upsert(
        ids=[f"doc:{doc_id}"],
        documents=[summary],
        metadatas=[{"type": "doc_summary", "doc_id": doc_id, "source_file": filename}],
    )
    logger.info('embedded 1 doc_summary chunk for %s: "%s"', filename, summary[:100])


def index_transaction_chunks(doc_id: str, filename: str, transactions: list[Transaction]) -> None:
    if not transactions:
        return

    groups: dict[tuple[str, str], list[Transaction]] = defaultdict(list)
    for t in transactions:
        month_key = f"{t.date.year:04d}-{t.date.month:02d}"
        groups[(month_key, t.category)].append(t)

    ids: list[str] = []
    docs: list[str] = []
    metas: list[dict] = []

    for (month, category), txns in groups.items():
        total = sum(t.amount for t in txns)
        header = (
            f"{filename} › {month} › {category.title()} — {len(txns)} txns, total ₹{total:,.0f}"
        )
        rows = "\n".join(
            f"| {t.date.isoformat()} | {t.description} | ₹{t.amount:,.0f} |" for t in txns
        )
        text = f"{header}\n\n| Date | Description | Amount |\n|---|---|---|\n{rows}"

        ids.append(f"txn:{doc_id}:{month}:{category}")
        docs.append(text)
        metas.append(
            {
                "type": "txn_chunk",
                "doc_id": doc_id,
                "month": month,
                "category": category,
                "row_ids": ",".join(str(t.id) for t in txns),
                "source_file": filename,
            }
        )

    if ids:
        get_collection().upsert(ids=ids, documents=docs, metadatas=metas)
        logger.info("chunked + embedded %d txn_chunk(s) for %s:", len(ids), filename)
        for chunk_id, doc in zip(ids, docs, strict=True):
            logger.info("  %s :: %s", chunk_id, doc.split("\n", 1)[0])


def delete_document_chunks(doc_id: str) -> None:
    collection = get_collection()
    collection.delete(where={"doc_id": doc_id})
    logger.info("deleted all chunks for doc_id=%s", doc_id)


def query_chunks(query: str, top_k: int = 5) -> list[dict]:
    collection = get_collection()
    if collection.count() == 0:
        logger.info(
            'vector query "%s" — collection is empty (0 chunks indexed), returning no results',
            query,
        )
        return []
    logger.info(
        'embedding query "%s" and searching %d indexed chunk(s) for top %d',
        query,
        collection.count(),
        top_k,
    )
    results = collection.query(query_texts=[query], n_results=min(top_k, collection.count()))
    documents = results.get("documents") or [[]]
    metadatas = results.get("metadatas") or [[]]
    distances = results.get("distances") or [[]]

    out: list[dict] = []
    for doc, meta, dist in zip(documents[0], metadatas[0], distances[0], strict=True):
        # Chroma's default space is L2 (Euclidean) distance, not bounded cosine similarity —
        # lower is more relevant. Chroma already returns results sorted by this, ascending.
        out.append({"text": doc, "metadata": meta, "distance": dist})
    return out
