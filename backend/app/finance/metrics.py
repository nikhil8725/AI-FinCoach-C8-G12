"""Deterministic financial metrics — no LLM calls anywhere in this file.

Operates on plain TxnSummary records so it stays testable without a database. Agents convert
SQLAlchemy Transaction rows into TxnSummary before calling into here.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date

NEEDS_CATEGORIES = {"rent", "utilities", "emi", "food", "transport"}
WANTS_CATEGORIES = {"shopping", "subscriptions", "other"}
SPEND_CATEGORIES = NEEDS_CATEGORIES | WANTS_CATEGORIES  # excludes income/transfer


@dataclass
class TxnSummary:
    txn_date: date
    amount: float
    txn_type: str  # "credit" | "debit"
    category: str
    merchant: str | None = None


@dataclass
class SplitResult:
    needs_pct: float
    wants_pct: float
    savings_pct: float
    needs_amount: float
    wants_amount: float
    savings_amount: float


@dataclass
class SubscriptionAlert:
    merchant: str
    monthly_amount: float
    months_seen: int
    growth_pct: float


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def month_key(d: date) -> str:
    """Public "YYYY-MM" formatter — for callers outside this module filtering raw dates against
    a month window (e.g. API layers), not just TxnSummary records."""
    return _month_key(d)


def months_in(transactions: list[TxnSummary]) -> list[str]:
    return sorted({_month_key(t.txn_date) for t in transactions})


def monthly_income(transactions: list[TxnSummary], month: str) -> float:
    return sum(
        t.amount for t in transactions if _month_key(t.txn_date) == month and t.category == "income"
    )


def monthly_spend(transactions: list[TxnSummary], month: str) -> float:
    return sum(
        t.amount
        for t in transactions
        if _month_key(t.txn_date) == month
        and t.txn_type == "debit"
        and t.category in SPEND_CATEGORIES
    )


def essential_monthly_spend(transactions: list[TxnSummary], month: str) -> float:
    return sum(
        t.amount
        for t in transactions
        if _month_key(t.txn_date) == month
        and t.txn_type == "debit"
        and t.category in NEEDS_CATEGORIES
    )


def savings_rate(income: float, spend: float) -> float:
    if income <= 0:
        return 0.0
    return round(max(0.0, (income - spend) / income) * 100, 1)


def needs_wants_savings_split(transactions: list[TxnSummary], month: str) -> SplitResult:
    income = monthly_income(transactions, month)
    debits = [t for t in transactions if _month_key(t.txn_date) == month and t.txn_type == "debit"]
    needs = sum(t.amount for t in debits if t.category in NEEDS_CATEGORIES)
    wants = sum(t.amount for t in debits if t.category in WANTS_CATEGORIES)

    if income <= 0:
        return SplitResult(0.0, 0.0, 0.0, needs, wants, 0.0)

    savings_amount = max(income - needs - wants, 0.0)
    return SplitResult(
        needs_pct=round(needs / income * 100, 1),
        wants_pct=round(wants / income * 100, 1),
        savings_pct=round(savings_amount / income * 100, 1),
        needs_amount=needs,
        wants_amount=wants,
        savings_amount=savings_amount,
    )


def emergency_fund_target(essential_spend: float, months: int = 6) -> float:
    return essential_spend * months


def monthly_cashflow_series(transactions: list[TxnSummary]) -> list[dict]:
    return [
        {
            "month": m,
            "income": monthly_income(transactions, m),
            "spend": monthly_spend(transactions, m),
        }
        for m in months_in(transactions)
    ]


def category_split(transactions: list[TxnSummary], month: str) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if (
            _month_key(t.txn_date) == month
            and t.txn_type == "debit"
            and t.category in SPEND_CATEGORIES
        ):
            totals[t.category] += t.amount

    grand_total = sum(totals.values())
    if grand_total == 0:
        return []
    return [
        {"category": cat, "amount": amt, "pct": round(amt / grand_total * 100, 1)}
        for cat, amt in sorted(totals.items(), key=lambda kv: -kv[1])
    ]


def last_n_months(all_months: list[str], n: int) -> list[str]:
    """Trailing N months from a sorted months_in() result — 'current month' means the latest
    month present in the data, not literally today's calendar month, since uploaded statements
    are always historical."""
    return all_months[-n:] if all_months else []


def window_income(transactions: list[TxnSummary], months: list[str]) -> float:
    """Average monthly income across the window — keeps the 'Monthly Income' label meaningful
    regardless of how many months are selected."""
    if not months:
        return 0.0
    return round(sum(monthly_income(transactions, m) for m in months) / len(months), 2)


def window_spend(transactions: list[TxnSummary], months: list[str]) -> float:
    if not months:
        return 0.0
    return round(sum(monthly_spend(transactions, m) for m in months) / len(months), 2)


def window_category_split(transactions: list[TxnSummary], months: list[str]) -> list[dict]:
    """Total spend per category summed across the whole window (not averaged) — answers
    'where did my money go over these N months', which is what a range selector is for."""
    month_set = set(months)
    totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if (
            _month_key(t.txn_date) in month_set
            and t.txn_type == "debit"
            and t.category in SPEND_CATEGORIES
        ):
            totals[t.category] += t.amount

    grand_total = sum(totals.values())
    if grand_total == 0:
        return []
    return [
        {"category": cat, "amount": amt, "pct": round(amt / grand_total * 100, 1)}
        for cat, amt in sorted(totals.items(), key=lambda kv: -kv[1])
    ]


def window_needs_wants_savings_split(
    transactions: list[TxnSummary], months: list[str]
) -> SplitResult:
    month_set = set(months)
    income = sum(monthly_income(transactions, m) for m in months)
    debits = [
        t for t in transactions if _month_key(t.txn_date) in month_set and t.txn_type == "debit"
    ]
    needs = sum(t.amount for t in debits if t.category in NEEDS_CATEGORIES)
    wants = sum(t.amount for t in debits if t.category in WANTS_CATEGORIES)

    if income <= 0:
        return SplitResult(0.0, 0.0, 0.0, needs, wants, 0.0)

    savings_amount = max(income - needs - wants, 0.0)
    return SplitResult(
        needs_pct=round(needs / income * 100, 1),
        wants_pct=round(wants / income * 100, 1),
        savings_pct=round(savings_amount / income * 100, 1),
        needs_amount=needs,
        wants_amount=wants,
        savings_amount=savings_amount,
    )


def window_cashflow_series(transactions: list[TxnSummary], months: list[str]) -> list[dict]:
    return [
        {
            "month": m,
            "income": monthly_income(transactions, m),
            "spend": monthly_spend(transactions, m),
        }
        for m in months
    ]


def detect_recurring_subscriptions(
    transactions: list[TxnSummary], min_months: int = 2
) -> list[SubscriptionAlert]:
    """Flags merchants billed roughly monthly under the 'subscriptions' category."""
    by_merchant: dict[str, dict[str, float]] = defaultdict(dict)
    for t in transactions:
        if t.category != "subscriptions" or t.txn_type != "debit" or not t.merchant:
            continue
        by_merchant[t.merchant][_month_key(t.txn_date)] = t.amount

    alerts: list[SubscriptionAlert] = []
    for merchant, month_amounts in by_merchant.items():
        months_seen = len(month_amounts)
        if months_seen < min_months:
            continue
        ordered = [month_amounts[m] for m in sorted(month_amounts)]
        growth_pct = round((ordered[-1] - ordered[0]) / ordered[0] * 100, 1) if ordered[0] else 0.0
        alerts.append(
            SubscriptionAlert(
                merchant=merchant,
                monthly_amount=ordered[-1],
                months_seen=months_seen,
                growth_pct=growth_pct,
            )
        )
    return alerts


# --- Health score sub-components (each 0-100, higher = healthier) ---


def debt_load_score(monthly_income_: float, total_minimum_payments: float, max_apr: float) -> int:
    if monthly_income_ <= 0:
        return 0
    dti_penalty = min(70.0, (total_minimum_payments / monthly_income_) * 100 * 2)
    apr_penalty = max(0.0, max_apr - 15.0) * 1.5 if max_apr else 0.0
    return round(max(0.0, min(100.0, 100 - dti_penalty - apr_penalty)))


def emergency_fund_score(runway_months: float, target_months: int = 6) -> int:
    return round(max(0.0, min(100.0, (runway_months / target_months) * 100)))


def savings_rate_score(savings_rate_pct: float, target_pct: float = 20.0) -> int:
    return round(max(0.0, min(100.0, (savings_rate_pct / target_pct) * 100)))


def spending_discipline_score(wants_pct: float, target_wants_pct: float = 30.0) -> int:
    overage = max(0.0, wants_pct - target_wants_pct)
    return round(max(0.0, min(100.0, 100 - overage * 2)))


def compute_health_score(
    debt_load: int, emergency_fund: int, savings_rate: int, spending_discipline: int
) -> int:
    """Weighted 0-100 score: debt load 30%, emergency fund 25%, savings rate 25%, discipline 20%."""
    return round(
        0.30 * debt_load + 0.25 * emergency_fund + 0.25 * savings_rate + 0.20 * spending_discipline
    )
