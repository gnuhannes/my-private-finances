from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account


async def get_account_or_404(session: AsyncSession, account_id: int) -> Account:
    acc = await session.get(Account, account_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc
