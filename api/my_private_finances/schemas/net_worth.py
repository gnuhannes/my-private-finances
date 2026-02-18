from __future__ import annotations

from datetime import date
from decimal import Decimal

from my_private_finances.schemas.base import StrictSchema


class AccountBalancePoint(StrictSchema):
    account_id: int
    balance: Decimal


class NetWorthPoint(StrictSchema):
    month: str  # "YYYY-MM"
    total: Decimal
    by_account: list[AccountBalancePoint]


class AccountNetWorthSummary(StrictSchema):
    account_id: int
    account_name: str
    currency: str
    opening_balance: Decimal
    opening_balance_date: date
    current_balance: Decimal
    month_over_month_change: Decimal


class NetWorthReport(StrictSchema):
    currency: str
    current_total: Decimal
    month_over_month_change: Decimal
    accounts: list[AccountNetWorthSummary]
    history: list[NetWorthPoint]  # monthly data points, oldest first
