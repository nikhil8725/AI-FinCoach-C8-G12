"""Pure-Python debt payoff simulation. LLMs never do this arithmetic — agents call this module
and only narrate the results.

Algorithm per month: accrue interest on every debt, pay each debt's minimum, then apply any
extra monthly payment to debts in priority order (avalanche: highest APR first; snowball:
lowest balance first), rolling leftover extra onto the next debt in that order once one is
paid off.
"""

from dataclasses import dataclass
from typing import Literal

MAX_MONTHS = 600  # 50-year safety cap so a debt that can't amortize can't loop forever


@dataclass
class DebtSnapshot:
    id: int
    name: str
    balance: float
    apr: float
    minimum_payment: float


@dataclass
class DebtMonthState:
    debt_id: int
    name: str
    remaining_balance: float
    payment: float
    interest_accrued: float


@dataclass
class MonthResult:
    month_index: int
    per_debt: list[DebtMonthState]
    total_remaining: float


@dataclass
class PayoffResult:
    strategy: str
    months: list[MonthResult]
    debt_free_month: int
    total_interest_paid: float
    total_interest_paid_minimum_only: float
    interest_saved: float


def order_debts(
    debts: list[DebtSnapshot], strategy: Literal["avalanche", "snowball"]
) -> list[DebtSnapshot]:
    if strategy == "avalanche":
        return sorted(debts, key=lambda d: -d.apr)
    return sorted(debts, key=lambda d: d.balance)


def _simulate(
    debts: list[DebtSnapshot], extra_monthly: float, priority_ids: list[int]
) -> tuple[list[MonthResult], float]:
    balances = {d.id: d.balance for d in debts}
    apr = {d.id: d.apr for d in debts}
    minimum = {d.id: d.minimum_payment for d in debts}
    name = {d.id: d.name for d in debts}

    months: list[MonthResult] = []
    total_interest = 0.0
    month_index = 0

    while any(balances[d.id] > 0.01 for d in debts) and month_index < MAX_MONTHS:
        month_index += 1
        interest_this_month: dict[int, float] = {}

        for d in debts:
            if balances[d.id] <= 0.01:
                interest_this_month[d.id] = 0.0
                continue
            interest = balances[d.id] * (apr[d.id] / 100 / 12)
            balances[d.id] += interest
            interest_this_month[d.id] = interest
            total_interest += interest

        payments = {d.id: 0.0 for d in debts}

        for d in debts:
            if balances[d.id] <= 0.01:
                continue
            pay = min(minimum[d.id], balances[d.id])
            balances[d.id] -= pay
            payments[d.id] += pay

        remaining_extra = max(0.0, extra_monthly)
        for debt_id in priority_ids:
            if remaining_extra <= 0:
                break
            if balances[debt_id] <= 0.01:
                continue
            pay = min(remaining_extra, balances[debt_id])
            balances[debt_id] -= pay
            payments[debt_id] += pay
            remaining_extra -= pay

        per_debt = [
            DebtMonthState(
                debt_id=d.id,
                name=name[d.id],
                remaining_balance=round(max(balances[d.id], 0.0), 2),
                payment=round(payments[d.id], 2),
                interest_accrued=round(interest_this_month[d.id], 2),
            )
            for d in debts
        ]
        months.append(
            MonthResult(
                month_index=month_index,
                per_debt=per_debt,
                total_remaining=round(sum(max(b, 0.0) for b in balances.values()), 2),
            )
        )

    return months, total_interest


def simulate_payoff(
    debts: list[DebtSnapshot],
    extra_monthly: float,
    strategy: Literal["avalanche", "snowball"],
) -> PayoffResult:
    if not debts:
        return PayoffResult(
            strategy=strategy,
            months=[],
            debt_free_month=0,
            total_interest_paid=0.0,
            total_interest_paid_minimum_only=0.0,
            interest_saved=0.0,
        )

    ordered = order_debts(debts, strategy)
    priority_ids = [d.id for d in ordered]

    months, total_interest = _simulate(debts, extra_monthly, priority_ids)
    _, baseline_interest = _simulate(debts, 0.0, priority_ids)

    debt_free_month = months[-1].month_index if months else 0
    interest_saved = max(0.0, baseline_interest - total_interest)

    return PayoffResult(
        strategy=strategy,
        months=months,
        debt_free_month=debt_free_month,
        total_interest_paid=round(total_interest, 2),
        total_interest_paid_minimum_only=round(baseline_interest, 2),
        interest_saved=round(interest_saved, 2),
    )
