from __future__ import annotations

from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Index, Numeric, String, UniqueConstraint, text
from sqlmodel import Field, SQLModel


class TransferCandidate(SQLModel, table=True):
    __tablename__ = "transfer_candidate"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Negative leg (outgoing transaction, e.g. -500 in Account 1)
    from_transaction_id: int = Field(
        foreign_key="transaction.id", ondelete="CASCADE", index=True
    )
    # Positive leg (incoming transaction, e.g. +500 in Account 2)
    to_transaction_id: int = Field(
        foreign_key="transaction.id", ondelete="CASCADE", index=True
    )

    confidence: Decimal = Field(sa_column=Column(Numeric(3, 2), nullable=False))

    # "pending" | "confirmed" | "dismissed" | "unlinked"
    status: str = Field(default="pending", sa_column=Column(String(16), nullable=False))

    # "auto" (detect_transfer_candidates) | "manual" (create_manual_transfer)
    source: str = Field(
        default="auto",
        sa_column=Column(String(16), nullable=False, server_default="auto"),
    )

    __table_args__ = (
        UniqueConstraint(
            "from_transaction_id",
            "to_transaction_id",
            name="uq_transfer_candidate_pair",
        ),
        # A transaction can be the subject of at most one *active* candidate at
        # a time (pending or confirmed) — whichever role it plays. Dismissed /
        # unlinked rows are history and don't count, so this is a partial
        # index, not a plain unique column. Backstops the application-level
        # checks in transfer_detection.py (is_transfer guard, stale-sibling
        # dismissal) that exist to keep this invariant from ever being
        # violated in the first place.
        Index(
            "uq_transfer_candidate_active_from",
            "from_transaction_id",
            unique=True,
            sqlite_where=text("status IN ('pending', 'confirmed')"),
        ),
        Index(
            "uq_transfer_candidate_active_to",
            "to_transaction_id",
            unique=True,
            sqlite_where=text("status IN ('pending', 'confirmed')"),
        ),
    )
