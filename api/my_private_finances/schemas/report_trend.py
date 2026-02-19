from __future__ import annotations

from decimal import Decimal
from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class CategoryTrendItem(StrictSchema):
    category_name: str | None
    avg_monthly: Decimal  # average spend over past N months (positive)
    current_month: Decimal  # actual spend this month (positive)
    projected: Decimal  # projected month-end spend (positive)


class SpendingTrendReport(StrictSchema):
    account_id: Optional[int]
    month: str  # YYYY-MM (the "current" month being analysed)
    lookback_months: int
    currency: str
    total_avg_monthly: Decimal
    total_current_month: Decimal
    total_projected: Decimal
    categories: list[CategoryTrendItem]  # sorted by avg_monthly descending
