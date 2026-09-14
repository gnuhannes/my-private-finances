from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import field_serializer

from my_private_finances.schemas.base import ReadSchema, StrictSchema


class TransactionSplitItem(StrictSchema):
    category_id: Optional[int] = None
    amount: Decimal
    note: Optional[str] = None


class TransactionSplitRead(ReadSchema):
    id: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    amount: Decimal
    note: Optional[str] = None

    @field_serializer("amount")
    def _serialize_amount(self, value: Decimal) -> str:
        return str(value)
