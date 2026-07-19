"""Document upload/list/delete + the ingestion pipeline that turns a raw file into
normalized Transaction or Debt rows.
"""

import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.ingestion.normalizer import categorize, extract_debt, map_columns, normalize_rows
from app.ingestion.parser import ParsedDocument, parse_file
from app.models import Debt, Document, Transaction
from app.rag.indexer import delete_document_chunks, index_document_summary, index_transaction_chunks
from app.schemas import DocumentOut, DocumentUploadResponse

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()

ALLOWED_EXTENSIONS = {"csv", "xlsx", "pdf", "txt"}
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_DATA_DIR = PROJECT_ROOT / "sample_data"


def _classify_doc_type(filename: str, parsed: ParsedDocument) -> str:
    low = filename.lower()
    if "credit" in low or "card" in low:
        return "credit_card"
    if "loan" in low:
        return "loan"
    if "salary" in low or "payslip" in low:
        return "salary_slip"
    if "statement" in low or "bank" in low:
        return "bank_statement"
    if parsed.tables and len(parsed.tables[0]) > 5:
        return "bank_statement"
    return "other"


def _ingest_document(db: Session, doc: Document, path: str) -> None:
    parsed = parse_file(path, doc.file_type)
    doc.doc_type = _classify_doc_type(doc.filename, parsed)
    doc.status = "parsing"
    db.flush()

    if doc.doc_type in ("credit_card", "loan"):
        debt = extract_debt(doc.filename, parsed.text, parsed.tables)
        if debt:
            db.add(
                Debt(
                    document_id=doc.id,
                    name=debt.name,
                    debt_type=debt.debt_type,
                    principal_balance=debt.principal_balance,
                    apr=debt.apr,
                    minimum_payment=debt.minimum_payment,
                )
            )
            doc.summary = (
                f"{debt.name}: ₹{debt.principal_balance:,.0f} outstanding at {debt.apr}% APR, "
                f"minimum payment ₹{debt.minimum_payment:,.0f}/mo."
            )
        else:
            doc.summary = (parsed.text or "")[:500] or "No debt details could be extracted."
    elif parsed.tables:
        table = max(parsed.tables, key=len)
        mapping = map_columns(table)
        txns = normalize_rows(table, mapping)
        categorize(txns)
        for t in txns:
            db.add(
                Transaction(
                    document_id=doc.id,
                    date=t.txn_date,
                    description=t.description,
                    merchant=t.description[:80],
                    amount=t.amount,
                    txn_type=t.txn_type,
                    category=t.category,
                    row_ref=t.row_ref,
                    balance_after=t.balance_after,
                )
            )
        doc.txn_count = len(txns)
        if txns:
            dmin = min(t.txn_date for t in txns)
            dmax = max(t.txn_date for t in txns)
            doc.summary = f"{len(txns)} transactions from {dmin.isoformat()} to {dmax.isoformat()}."
        else:
            doc.summary = "No transactions could be extracted from this document."
    else:
        doc.summary = (parsed.text or "")[:500] or "No extractable content."

    doc.parse_warning = parsed.warning
    doc.status = "parsed"


def _save_and_ingest(db: Session, filename: str, content: bytes) -> Document:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={"code": "unsupported_file_type", "message": f"Unsupported file type: .{ext}"},
        )

    doc_id = uuid4().hex
    path = os.path.join(settings.uploads_dir, f"{doc_id}_{filename}")
    with open(path, "wb") as f:
        f.write(content)

    doc = Document(id=doc_id, filename=filename, file_type=ext, status="pending", raw_path=path)
    db.add(doc)
    db.flush()

    try:
        _ingest_document(db, doc, path)
    except Exception as err:  # noqa: BLE001 — a bad statement must degrade, never 500 the request
        doc.status = "failed"
        doc.parse_warning = f"Failed to parse this document: {err}"

    db.commit()
    db.refresh(doc)

    if doc.status == "parsed":
        index_document_summary(doc.id, doc.filename, doc.summary or "")
        txns = db.query(Transaction).filter(Transaction.document_id == doc.id).all()
        index_transaction_chunks(doc.id, doc.filename, txns)

    return doc


@router.post("", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile, db: Session = Depends(get_db)
) -> DocumentUploadResponse:
    if not file.filename:
        raise HTTPException(
            status_code=400, detail={"code": "missing_filename", "message": "No filename provided."}
        )
    content = await file.read()
    doc = _save_and_ingest(db, file.filename, content)
    return DocumentUploadResponse(doc_id=doc.id, filename=doc.filename, status=doc.status)


@router.post("/sample", response_model=list[DocumentUploadResponse])
def load_sample_data(db: Session = Depends(get_db)) -> list[DocumentUploadResponse]:
    if not SAMPLE_DATA_DIR.is_dir():
        raise HTTPException(
            status_code=404,
            detail={"code": "sample_data_missing", "message": "sample_data/ not found."},
        )

    results: list[DocumentUploadResponse] = []
    for path in sorted(SAMPLE_DATA_DIR.iterdir()):
        ext = path.suffix.lstrip(".").lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        content = path.read_bytes()
        doc = _save_and_ingest(db, path.name, content)
        results.append(
            DocumentUploadResponse(doc_id=doc.id, filename=doc.filename, status=doc.status)
        )
    return results


@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)) -> list[DocumentOut]:
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return [
        DocumentOut(
            id=d.id,
            filename=d.filename,
            file_type=d.file_type,
            doc_type=d.doc_type,
            status=d.status,
            uploaded_at=d.uploaded_at,
            txn_count=d.txn_count,
            parse_warning=d.parse_warning,
        )
        for d in docs
    ]


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, db: Session = Depends(get_db)) -> None:
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(
            status_code=404, detail={"code": "not_found", "message": "Document not found."}
        )
    db.query(Transaction).filter(Transaction.document_id == doc_id).delete()
    db.query(Debt).filter(Debt.document_id == doc_id).delete()
    if os.path.exists(doc.raw_path):
        os.remove(doc.raw_path)
    db.delete(doc)
    db.commit()
    delete_document_chunks(doc_id)
