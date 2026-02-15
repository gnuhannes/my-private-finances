from pydantic import BaseModel

from .transaction_read import TransactionRead


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
