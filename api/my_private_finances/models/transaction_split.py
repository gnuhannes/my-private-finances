from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Numeric, Text
from sqlmodel import Field, SQLModel

from my_private_finances.models.mixins import TimestampMixin


class TransactionSplitBase(SQLModel):
    transaction_id: int = Field(
        foreign_key="transaction.id", ondelete="CASCADE", index=True
    )
    # nullable = an unassigned portion of the split
    category_id: Optional[int] = Field(
        default=None, foreign_key="category.id", ondelete="SET NULL"
    )
    amount: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))
    note: Optional[str] = Field(default=None, sa_column=Column(Text))


class TransactionSplit(TimestampMixin, TransactionSplitBase, table=True):
    __tablename__ = "transaction_split"

    id: Optional[int] = Field(default=None, primary_key=True)
