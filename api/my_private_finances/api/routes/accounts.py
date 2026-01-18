from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from my_private_finances.deps import get_session
from my_private_finances.models import Account
from my_private_finances.schemas import AccountCreate, AccountRead

router = APIRouter(prefix="/accounts", tags=["accounts"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=AccountRead)
async def create_account(
    account: Annotated[AccountCreate, Body()], session: SessionDep
):
    db_obj = Account(name=account.name, currency=account.currency)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)

    assert db_obj.id is not None
    return AccountRead(id=db_obj.id, name=db_obj.name, currency=db_obj.currency)


@router.get("", response_model=list[AccountRead])
async def list_accounts(session: SessionDep):
    res = await session.execute(select(Account).order_by(Account.id))  # type: ignore[arg-type]
    rows = list(res.scalars().all())
    out: list[AccountRead] = []
    for a in rows:
        assert a.id is not None
        out.append(AccountRead(id=a.id, name=a.name, currency=a.currency))
    return out
