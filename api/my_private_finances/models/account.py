from __future__ import annotations

from typing import Optional

from sqlalchemy import String
from sqlmodel import Field, SQLModel


class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_type=String(120))
    currency: str = Field(default="EUR", sa_type=String(3))
