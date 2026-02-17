from __future__ import annotations

from typing import Optional

from my_private_finances.schemas.base import StrictSchema


class TransactionUpdate(StrictSchema):
    category_id: Optional[int] = None
