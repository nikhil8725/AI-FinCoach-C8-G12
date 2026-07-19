"""Unit tests for the pure-Python debt payoff simulator."""

import math

from app.finance.debt_math import MAX_MONTHS, DebtSnapshot, order_debts, simulate_payoff


def test_empty_debt_list_returns_zeroed_result():
    result = simulate_payoff([], extra_monthly=0.0, strategy="avalanche")
    assert result.months == []
    assert result.debt_free_month == 0
    assert result.total_interest_paid == 0.0
    assert result.interest_saved == 0.0


def test_zero_apr_debt_pays_off_in_exact_months():
    debt = DebtSnapshot(id=1, name="Zero APR Loan", balance=1200.0, apr=0.0, minimum_payment=200.0)
    result = simulate_payoff([debt], extra_monthly=0.0, strategy="avalanche")
    assert result.debt_free_month == 6  # 1200 / 200, no interest
    assert result.total_interest_paid == 0.0
    assert result.months[-1].total_remaining == 0.0


def test_extra_payment_larger_than_balance_clears_in_one_month():
    debt = DebtSnapshot(id=1, name="Small Debt", balance=500.0, apr=18.0, minimum_payment=50.0)
    result = simulate_payoff([debt], extra_monthly=100_000.0, strategy="avalanche")
    assert result.debt_free_month == 1
    assert result.months[0].total_remaining == 0.0


def test_avalanche_orders_by_apr_descending():
    debts = [
        DebtSnapshot(id=1, name="Low APR", balance=10_000.0, apr=10.0, minimum_payment=200.0),
        DebtSnapshot(id=2, name="High APR", balance=10_000.0, apr=30.0, minimum_payment=200.0),
    ]
    ordered = order_debts(debts, "avalanche")
    assert [d.id for d in ordered] == [2, 1]


def test_snowball_orders_by_balance_ascending():
    debts = [
        DebtSnapshot(id=1, name="Big Balance", balance=20_000.0, apr=20.0, minimum_payment=200.0),
        DebtSnapshot(id=2, name="Small Balance", balance=5_000.0, apr=15.0, minimum_payment=200.0),
    ]
    ordered = order_debts(debts, "snowball")
    assert [d.id for d in ordered] == [2, 1]


def test_avalanche_pays_off_highest_apr_debt_first():
    debts = [
        DebtSnapshot(id=1, name="Low APR", balance=10_000.0, apr=10.0, minimum_payment=200.0),
        DebtSnapshot(id=2, name="High APR", balance=10_000.0, apr=36.0, minimum_payment=200.0),
    ]
    result = simulate_payoff(debts, extra_monthly=2000.0, strategy="avalanche")
    high_apr_zeroed_month = next(
        m.month_index
        for m in result.months
        if next(pd.remaining_balance for pd in m.per_debt if pd.debt_id == 2) == 0.0
    )
    low_apr_zeroed_month = next(
        m.month_index
        for m in result.months
        if next(pd.remaining_balance for pd in m.per_debt if pd.debt_id == 1) == 0.0
    )
    assert high_apr_zeroed_month < low_apr_zeroed_month


def test_extra_payment_reduces_total_interest_and_reports_savings():
    debt = DebtSnapshot(id=1, name="Card", balance=50_000.0, apr=36.0, minimum_payment=1500.0)
    minimum_only = simulate_payoff([debt], extra_monthly=0.0, strategy="avalanche")
    with_extra = simulate_payoff([debt], extra_monthly=3000.0, strategy="avalanche")

    assert with_extra.total_interest_paid < minimum_only.total_interest_paid
    assert with_extra.debt_free_month < minimum_only.debt_free_month
    assert with_extra.interest_saved > 0.0
    assert math.isclose(
        with_extra.interest_saved,
        minimum_only.total_interest_paid - with_extra.total_interest_paid,
        rel_tol=1e-6,
    )


def test_higher_apr_accrues_more_total_interest_for_same_terms():
    low = simulate_payoff(
        [DebtSnapshot(id=1, name="Low", balance=20_000.0, apr=12.0, minimum_payment=800.0)],
        extra_monthly=0.0,
        strategy="avalanche",
    )
    high = simulate_payoff(
        [DebtSnapshot(id=1, name="High", balance=20_000.0, apr=30.0, minimum_payment=800.0)],
        extra_monthly=0.0,
        strategy="avalanche",
    )
    assert high.total_interest_paid > low.total_interest_paid


def test_negative_amortization_terminates_at_safety_cap():
    # Minimum payment doesn't cover monthly interest at this APR — balance can never shrink.
    debt = DebtSnapshot(
        id=1, name="Runaway Card", balance=100_000.0, apr=48.0, minimum_payment=100.0
    )
    result = simulate_payoff([debt], extra_monthly=0.0, strategy="avalanche")
    assert result.debt_free_month == MAX_MONTHS
    assert result.months[-1].total_remaining > debt.balance  # it grew, never paid off


def test_total_remaining_is_non_increasing_when_payments_cover_interest():
    debt = DebtSnapshot(id=1, name="Loan", balance=30_000.0, apr=14.0, minimum_payment=1200.0)
    result = simulate_payoff([debt], extra_monthly=500.0, strategy="avalanche")
    remainders = [m.total_remaining for m in result.months]
    assert all(remainders[i] >= remainders[i + 1] - 1e-6 for i in range(len(remainders) - 1))
    assert remainders[-1] == 0.0


def test_multi_debt_schedule_ends_with_zero_total_balance():
    debts = [
        DebtSnapshot(id=1, name="Credit Card", balance=145_000.0, apr=42.0, minimum_payment=7250.0),
        DebtSnapshot(
            id=2, name="Personal Loan", balance=320_000.0, apr=14.0, minimum_payment=10_943.0
        ),
    ]
    result = simulate_payoff(debts, extra_monthly=5000.0, strategy="avalanche")
    assert result.months[-1].total_remaining == 0.0
    assert result.debt_free_month < MAX_MONTHS
