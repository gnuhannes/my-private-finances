from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Date, Index, Numeric, String, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class TransactionBase(SQLModel):
    account_id: int = Field(index=True, foreign_key="account.id")

    booking_date: date = Field(sa_column=Column(Date, index=True, nullable=False))
    amount: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))
    currency: str = Field(sa_column=Column(String(3), nullable=False), default="EUR")

    payee: Optional[str] = Field(default=None, sa_column=Column(String(255)))
    purpose: Optional[str] = Field(default=None, sa_column=Column(Text))

    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    external_id: Optional[str] = Field(default=None, sa_column=Column(String(128)))
    import_source: Optional[str] = Field(default=None, sa_column=Column(String(64)))

    # Important: deterministic dupe check pro account
    import_hash: str = Field(sa_column=Column(String(64), nullable=False))


class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    __table_args__ = (
        UniqueConstraint("account_id", "import_hash", name="uq_tx_account_import_hash"),
        Index("ix_tx_account_date", "account_id", "booking_date"),
    )
