from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from my_private_finances.schemas.base import StrictSchema


class BudgetCreate(StrictSchema):
    category_id: int
    amount: Decimal = Field(gt=0)


class BudgetUpdate(StrictSchema):
    amount: Optional[Decimal] = Field(default=None, gt=0)


class BudgetRead(BaseModel):
    id: int
    category_id: int
    category_name: str
    amount: Decimal
