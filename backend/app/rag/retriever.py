"""The only sanctioned SQL surface for the coach — the router selects which of these helpers
to run based on intent; their outputs become numbered sources. An LLM never writes raw SQL here.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import BudgetCap, Debt, Transaction


def latest_month(db: Session) -> str | None:
    """The most recent "YYYY-MM" present in the transaction data — the coach's anchor for "last
    month"/"this month" questions, since the sample data is historical and not tied to today's
    real calendar date (same convention as the dashboard/budget range selector)."""
    row = db.query(func.max(func.strftime("%Y-%m", Transaction.date))).scalar()
    return row


def recent_months(db: Session, n: int = 2) -> list[str]:
    """The `n` most recent distinct "YYYY-MM" months present in the data, newest first — lets the
    coach give a full category breakdown for both "this month" and "last month" rather than only
    the single latest one."""
    rows = (
        db.query(func.strftime("%Y-%m", Transaction.date).label("month"))
        .distinct()
        .order_by(func.strftime("%Y-%m", Transaction.date).desc())
        .limit(n)
        .all()
    )
    return [r[0] for r in rows]


def spend_by_category(db: Session, month_range: tuple[str, str] | None = None) -> list[dict]:
    query = db.query(Transaction.category, func.sum(Transaction.amount).label("total")).filter(
        Transaction.txn_type == "debit"
    )
    if month_range:
        start, end = month_range
        query = query.filter(Transaction.date >= f"{start}-01", Transaction.date < f"{end}-32")
    rows = query.group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()
    return [{"category": cat, "amount": round(total, 2)} for cat, total in rows]


def budget_cap_status(db: Session, month: str) -> list[dict]:
    """Actual spend vs the user's configured cap per category for `month`, with the same
    over/warning/ok thresholds shown on the Budget page — lets the coach answer "where did I
    overspend" against real caps instead of only raw category totals with nothing to compare."""
    actual = {c["category"]: c["amount"] for c in spend_by_category(db, month_range=(month, month))}
    caps = {c.category: c.cap_amount for c in db.query(BudgetCap).all()}
    results = []
    for category in sorted(set(actual) | set(caps)):
        cap = caps.get(category, 0.0)
        amount = actual.get(category, 0.0)
        if cap <= 0:
            status = "no cap set"
        elif amount > cap:
            status = "over"
        elif amount > cap * 0.85:
            status = "warning"
        else:
            status = "ok"
        results.append(
            {"category": category, "actual": round(amount, 2), "cap": cap, "status": status}
        )
    return results


def monthly_cashflow(db: Session) -> list[dict]:
    rows = (
        db.query(
            func.strftime("%Y-%m", Transaction.date).label("month"),
            Transaction.txn_type,
            func.sum(Transaction.amount).label("total"),
        )
        .group_by("month", Transaction.txn_type)
        .order_by("month")
        .all()
    )
    by_month: dict[str, dict[str, float]] = {}
    for month, txn_type, total in rows:
        by_month.setdefault(month, {"income": 0.0, "spend": 0.0})
        if txn_type == "credit":
            by_month[month]["income"] += total
        else:
            by_month[month]["spend"] += total
    return [{"month": m, **v} for m, v in sorted(by_month.items())]


def top_merchants(db: Session, n: int = 5) -> list[dict]:
    rows = (
        db.query(
            Transaction.merchant,
            func.sum(Transaction.amount).label("total"),
            func.count().label("count"),
        )
        .filter(Transaction.txn_type == "debit", Transaction.merchant.isnot(None))
        .group_by(Transaction.merchant)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(n)
        .all()
    )
    return [{"merchant": m, "amount": round(total, 2), "count": count} for m, total, count in rows]


def transactions_matching(db: Session, keyword: str, month: str | None = None) -> list[Transaction]:
    query = db.query(Transaction).filter(Transaction.description.ilike(f"%{keyword}%"))
    if month:
        query = query.filter(Transaction.date >= f"{month}-01", Transaction.date < f"{month}-32")
    return query.order_by(Transaction.date.desc()).limit(20).all()


def debt_summary(db: Session) -> dict:
    debts = db.query(Debt).all()
    if not debts:
        return {"debts": [], "total_balance": 0.0, "total_minimum": 0.0, "highest_apr": None}
    return {
        "debts": [
            {
                "name": d.name,
                "balance": d.principal_balance,
                "apr": d.apr,
                "minimum_payment": d.minimum_payment,
            }
            for d in debts
        ],
        "total_balance": round(sum(d.principal_balance for d in debts), 2),
        "total_minimum": round(sum(d.minimum_payment for d in debts), 2),
        "highest_apr": max(debts, key=lambda d: d.apr).name,
    }
