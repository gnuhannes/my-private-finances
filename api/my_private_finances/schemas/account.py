from __future__ import annotations

from pydantic import BaseModel, Field

from my_private_finances.schemas.base import StrictSQLModel


class AccountCreate(StrictSQLModel):
    name: str = Field(min_length=1, max_length=120)
    currency: str = Field(default="EUR", min_length=3, max_length=3)


class AccountRead(BaseModel):
    id: int
    name: str
    currency: str
