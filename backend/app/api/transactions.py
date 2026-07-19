"""GET /api/transactions — backs the Recent Activities table's search/filter/pagination."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Transaction
from app.schemas import TransactionListResponse, TransactionOut

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    search: str = "",
    category: str = "",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    query = db.query(Transaction)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    if category:
        query = query.filter(Transaction.category == category)

    total = query.count()
    rows = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return TransactionListResponse(
        items=[
            TransactionOut(
                id=t.id,
                date=t.date,
                description=t.description,
                merchant=t.merchant,
                amount=t.amount,
                txn_type=t.txn_type,
                category=t.category,
            )
            for t in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
