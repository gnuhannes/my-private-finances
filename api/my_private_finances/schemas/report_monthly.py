from decimal import Decimal
from typing import Optional

from pydantic import Field

from my_private_finances.schemas import StrictSQLModel


class PayeeTotal(StrictSQLModel):
    payee: Optional[str] = Field(default=None)
    total: Decimal


class MonthlyReport(StrictSQLModel):
    account_id: int
    month: str
    currency: str

    transactions_count: int

    income_total: Decimal
    expense_total: Decimal
    net_total: Decimal

    top_payees: list[PayeeTotal]
