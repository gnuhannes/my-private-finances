from __future__ import annotations

from decimal import Decimal
from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class CostTypeBreakdown(StrictSchema):
    cost_type: Optional[str]
    total: Decimal
    category_count: int


class FixedVsVariableReport(StrictSchema):
    account_id: int
    month: str
    currency: str
    fixed_total: Decimal
    variable_total: Decimal
    unclassified_total: Decimal
    breakdown: list[CostTypeBreakdown]
