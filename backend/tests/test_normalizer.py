"""Messy CSV -> clean transactions. LLM calls are monkeypatched to fail so these tests exercise
the rule-based fallback path deterministically, with no network calls."""

from datetime import date

import pandas as pd
import pytest

from app.ingestion import normalizer as norm
from app.ingestion.normalizer import (
    ColumnMapping,
    _rule_based_category,
    _rule_based_column_mapping,
    categorize,
    normalize_rows,
)
from app.llm import LLMCallError


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    def _always_fails(*args, **kwargs):
        raise LLMCallError("no network in tests")

    monkeypatch.setattr(norm, "call_structured", _always_fails)


def test_rule_based_column_mapping_finds_debit_credit_columns():
    df = pd.DataFrame(
        columns=["Txn Date", "Narration", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]
    )
    mapping = _rule_based_column_mapping(list(df.columns))
    assert mapping.date_column == "Txn Date"
    assert mapping.description_column == "Narration"
    assert mapping.debit_column == "Withdrawal Amt"
    assert mapping.credit_column == "Deposit Amt"


def test_normalize_rows_handles_messy_currency_and_dates():
    df = pd.DataFrame(
        [
            {
                "Date": "01-03-2026",
                "Narration": "  Salary Credit  ",
                "Debit": "",
                "Credit": "₹95,000.00",
            },
            {"Date": "03/03/2026", "Narration": "Rent Payment", "Debit": "22,000", "Credit": ""},
            {"Date": "not a date", "Narration": "Broken Row", "Debit": "100", "Credit": ""},
            {
                "Date": "05-03-2026",
                "Narration": "",
                "Debit": "50",
                "Credit": "",
            },  # blank description dropped
            {
                "Date": "07-03-2026",
                "Narration": "Zero Amount Row",
                "Debit": "",
                "Credit": "",
            },  # dropped
        ]
    )
    mapping = ColumnMapping(
        date_column="Date",
        description_column="Narration",
        debit_column="Debit",
        credit_column="Credit",
    )
    txns = normalize_rows(df, mapping)

    # Only the two clean, non-zero, dated rows survive.
    assert len(txns) == 2
    salary, rent = txns
    assert salary.txn_date == date(2026, 3, 1)
    assert salary.amount == 95000.0
    assert salary.txn_type == "credit"
    assert rent.txn_date == date(2026, 3, 3)
    assert rent.amount == 22000.0
    assert rent.txn_type == "debit"


def test_normalize_rows_infers_type_from_signed_amount_column():
    df = pd.DataFrame(
        [
            {"Date": "01-04-2026", "Narration": "Salary", "Amount": "50000"},
            {"Date": "02-04-2026", "Narration": "Groceries", "Amount": "-1500.50"},
        ]
    )
    mapping = ColumnMapping(
        date_column="Date", description_column="Narration", amount_column="Amount"
    )
    txns = normalize_rows(df, mapping)

    assert txns[0].txn_type == "credit"
    assert txns[0].amount == 50000.0
    assert txns[1].txn_type == "debit"
    assert txns[1].amount == 1500.50  # unsigned magnitude


def test_rule_based_category_matches_known_merchants():
    assert _rule_based_category("UPI-SWIGGY-PURCHASE") == "food"
    assert _rule_based_category("UPI-NETFLIX-SUBSCRIPTION") == "subscriptions"
    assert _rule_based_category("SOME UNKNOWN MERCHANT XYZ") == "other"


def test_categorize_falls_back_to_rules_when_llm_unavailable():
    df = pd.DataFrame(
        [
            {
                "Date": "01-05-2026",
                "Narration": "NEFT CR-EMPLOYER-SALARY",
                "Debit": "",
                "Credit": "95000",
            },
            {
                "Date": "05-05-2026",
                "Narration": "UPI-ZOMATO-PURCHASE",
                "Debit": "450",
                "Credit": "",
            },
        ]
    )
    mapping = ColumnMapping(
        date_column="Date",
        description_column="Narration",
        debit_column="Debit",
        credit_column="Credit",
    )
    txns = normalize_rows(df, mapping)
    categorize(txns)

    assert txns[0].category == "income"
    assert txns[1].category == "food"


def test_categorize_never_crashes_on_empty_input():
    categorize([])  # must not raise
