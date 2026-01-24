from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class TransactionCreate(BaseModel):
    account_id: int
    booking_date: date
    amount: Decimal
    currency: str = Field(default="EUR", min_length=3, max_length=3)

    payee: Optional[str] = None
    purpose: Optional[str] = None

    category_id: Optional[int] = None

    external_id: Optional[str] = None
    import_source: Optional[str] = None

    @field_serializer("amount")
    def _serialize_amount(self, value: Decimal) -> str:
        return str(value)
