from __future__ import annotations

from decimal import Decimal
from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class MonthSummary(StrictSchema):
    month: str  # "YYYY-MM"
    income: Decimal  # sum of positive amounts (non-transfer)
    expenses: Decimal  # abs sum of negative amounts — always positive
    net: Decimal  # income - expenses
    savings_rate: Decimal  # net / income * 100, or 0 if income == 0


class AnnualReport(StrictSchema):
    year: int
    account_id: Optional[int]
    currency: str
    total_income: Decimal
    total_expenses: Decimal
    total_net: Decimal
    avg_savings_rate: Decimal  # mean savings_rate of months where income > 0
    months: list[MonthSummary]  # all 12 months, zeros for empty months
