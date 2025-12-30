from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Numeric, String, Text, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class TransactionBase(SQLModel):
    account_id: int = Field(foreign_key="account.id", index=True)

    booking_date: date = Field(index=True)  # DATE ist implizit korrekt
    amount: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))

    currency: str = Field(default="EUR", sa_type=String(3))

    payee: Optional[str] = Field(default=None, sa_type=String(255))
    purpose: Optional[str] = Field(default=None, sa_type=Text)

    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    external_id: Optional[str] = Field(default=None, sa_type=String(128))
    import_source: Optional[str] = Field(default=None, sa_type=String(64))

    # Important: deterministic dupe check pro account
    import_hash: str = Field(sa_type=String(64))


class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    __table_args__ = (
        UniqueConstraint("account_id", "import_hash", name="uq_tx_account_import_hash"),
        Index("ix_tx_account_date", "account_id", "booking_date"),
    )
