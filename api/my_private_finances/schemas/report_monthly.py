from decimal import Decimal
from typing import Optional

from pydantic import Field

from my_private_finances.schemas import StrictSchema


class PayeeTotal(StrictSchema):
    payee: Optional[str] = Field(default=None)
    total: Decimal


class CategoryTotal(StrictSchema):
    category_name: Optional[str] = Field(default=None)
    total: Decimal


class MonthlyReport(StrictSchema):
    account_id: int
    month: str
    currency: str

    transactions_count: int

    income_total: Decimal
    expense_total: Decimal
    net_total: Decimal

    top_payees: list[PayeeTotal]
    category_breakdown: list[CategoryTotal]
