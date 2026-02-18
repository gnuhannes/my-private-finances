from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class RecurringPatternRead(StrictSchema):
    id: int
    account_id: int
    payee: str
    typical_amount: Decimal
    frequency: str
    confidence: Decimal
    last_seen: date
    occurrence_count: int
    is_active: bool
    user_confirmed: bool
    category_id: Optional[int] = None
    category_name: Optional[str] = None


class RecurringPatternUpdate(StrictSchema):
    is_active: Optional[bool] = None
    user_confirmed: Optional[bool] = None


class RecurringSummary(StrictSchema):
    account_id: int
    total_monthly_recurring: Decimal
    pattern_count: int
    by_frequency: list[FrequencyTotal]


class FrequencyTotal(StrictSchema):
    frequency: str
    count: int
    total: Decimal
