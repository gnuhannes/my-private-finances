from __future__ import annotations

from typing import Optional

from sqlalchemy import String
from sqlmodel import Field, SQLModel


class CategoryBase(SQLModel):
    name: str = Field(sa_type=String(120), index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")


class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
