from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class TransferLeg(StrictSchema):
    transaction_id: int
    account_id: int
    account_name: str
    booking_date: date
    amount: Decimal
    payee: Optional[str] = None


class TransferCandidateRead(StrictSchema):
    id: int
    from_leg: TransferLeg
    to_leg: TransferLeg
    confidence: Decimal
    status: str  # "pending" | "confirmed" | "dismissed"
