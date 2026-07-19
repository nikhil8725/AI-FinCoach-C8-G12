"""SQLAlchemy ORM tables — the single persistent store for FinCoach AI."""

from datetime import date, datetime

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Document(Base):
    __tablename__ = "document"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(16))  # csv | xlsx | pdf | txt
    doc_type: Mapped[str | None] = mapped_column(
        String(32)
    )  # bank_statement | credit_card | loan | salary_slip | other
    status: Mapped[str] = mapped_column(
        String(16), default="pending"
    )  # pending | parsing | parsed | failed
    uploaded_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    txn_count: Mapped[int] = mapped_column(Integer, default=0)
    parse_warning: Mapped[str | None] = mapped_column(String(512))
    summary: Mapped[str | None] = mapped_column(String(2000))
    raw_path: Mapped[str] = mapped_column(String(512))


class Transaction(Base):
    __tablename__ = "transaction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("document.id"))
    date: Mapped[date]
    description: Mapped[str] = mapped_column(String(500))
    merchant: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Float)  # unsigned magnitude
    txn_type: Mapped[str] = mapped_column(String(8))  # credit | debit
    category: Mapped[str] = mapped_column(String(32))
    balance_after: Mapped[float | None] = mapped_column(Float)
    row_ref: Mapped[str | None] = mapped_column(String(64))  # provenance: original row index / page
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class Debt(Base):
    __tablename__ = "debt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("document.id"))
    name: Mapped[str] = mapped_column(String(255))
    debt_type: Mapped[str] = mapped_column(String(32))  # credit_card | personal_loan | other
    principal_balance: Mapped[float] = mapped_column(Float)
    apr: Mapped[float] = mapped_column(Float)
    minimum_payment: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class AnalysisRun(Base):
    __tablename__ = "analysis_run"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    started_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    completed_at: Mapped[datetime | None]
    status: Mapped[str] = mapped_column(String(16), default="running")  # running | complete | error
    health_score: Mapped[int | None]
    health_breakdown_json: Mapped[str | None] = mapped_column(String(2000))


class Insight(Base):
    __tablename__ = "insight"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id: Mapped[str] = mapped_column(ForeignKey("analysis_run.id"))
    agent: Mapped[str] = mapped_column(
        String(32)
    )  # data_agent | debt_agent | savings_agent | budget_agent | synthesizer
    category: Mapped[str | None] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(String(2000))
    evidence_json: Mapped[str] = mapped_column(String(4000), default="[]")
    severity: Mapped[str | None] = mapped_column(String(16))  # info | warning | success
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(String(4000))
    agent: Mapped[str | None] = mapped_column(String(16))  # debt | savings | budget | general
    citations_json: Mapped[str | None] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    target_amount: Mapped[float] = mapped_column(Float)
    current_amount: Mapped[float] = mapped_column(Float, default=0)
    target_date: Mapped[date | None]
    monthly_contribution: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(
        String(16), default="on_track"
    )  # on_track | off_track | completed
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class BudgetCap(Base):
    __tablename__ = "budget_cap"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(32), unique=True)
    cap_amount: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
