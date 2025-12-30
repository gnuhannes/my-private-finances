from __future__ import annotations

from typing import Optional

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


class AccountBase(SQLModel):
    name: str = Field(sa_column=Column(String(120), nullable=False))
    currency: str = Field(sa_column=Column(String(3), nullable=False), default="EUR")


class Account(AccountBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
