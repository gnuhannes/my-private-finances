from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from my_private_finances.schemas.base import StrictSchema


class CategoryCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=120)
    parent_id: Optional[int] = None


class CategoryUpdate(StrictSchema):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    parent_id: Optional[int] = None


class CategoryRead(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
