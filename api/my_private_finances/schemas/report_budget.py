from __future__ import annotations

from decimal import Decimal

from my_private_finances.schemas.base import StrictSchema


class BudgetComparison(StrictSchema):
    category_id: int
    category_name: str
    budgeted: Decimal
    actual: Decimal
    remaining: Decimal
