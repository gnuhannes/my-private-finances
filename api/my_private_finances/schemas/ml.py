from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlmodel import SQLModel


class TrainResult(SQLModel):
    num_samples: int
    num_categories: int


class Suggestion(SQLModel):
    transaction_id: int
    category_id: int
    category_name: str
    confidence: float
    payee: str | None
    purpose: str | None
    amount: Decimal
    booking_date: date
