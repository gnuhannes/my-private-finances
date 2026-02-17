from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.params import Query
from typing import Annotated
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Transaction, Account, Category
from my_private_finances.schemas import (
    TransactionRead,
    TransactionCreate,
    TransactionListResponse,
    TransactionUpdate,
)

from my_private_finances.deps import get_session
from my_private_finances.services.transaction_hash import compute_import_hash, HashInput

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionRead, status_code=201)
async def create_transaction(
    tx: TransactionCreate,
    session: AsyncSession = Depends(get_session),
) -> TransactionRead:
    res = await session.execute(
        select(Account).where(Account.id == tx.account_id)  # type: ignore[arg-type]
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Account not found")

    import_hash = compute_import_hash(
        HashInput(
            account_id=tx.account_id,
            booking_date=tx.booking_date,
            amount=tx.amount,
            currency=tx.currency,
            payee=tx.payee,
            purpose=tx.purpose,
            external_id=tx.external_id,
            import_source=tx.import_source,
        )
    )

    db_obj = Transaction(
        account_id=tx.account_id,
        booking_date=tx.booking_date,
        amount=tx.amount,
        currency=tx.currency,
        payee=tx.payee,
        purpose=tx.purpose,
        category_id=tx.category_id,
        external_id=tx.external_id,
        import_source=tx.import_source,
        import_hash=import_hash,
    )

    session.add(db_obj)

    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="Duplicate transaction (import_hash)"
        ) from e

    await session.refresh(db_obj)

    if db_obj.id is None:
        raise HTTPException(status_code=500, detail="Transaction ID not assigned")

    return TransactionRead(
        id=db_obj.id,
        account_id=db_obj.account_id,
        booking_date=db_obj.booking_date,
        amount=db_obj.amount,
        currency=db_obj.currency,
        payee=db_obj.payee,
        purpose=db_obj.purpose,
        category_id=db_obj.category_id,
        external_id=db_obj.external_id,
        import_source=db_obj.import_source,
        import_hash=db_obj.import_hash,
    )


@router.patch("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    session: AsyncSession = Depends(get_session),
) -> TransactionRead:
    db_obj = await session.get(Transaction, transaction_id)
    if db_obj is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.category_id is not None:
        cat = await session.get(Category, payload.category_id)
        if cat is None:
            raise HTTPException(status_code=422, detail="Category not found")

    db_obj.category_id = payload.category_id
    await session.commit()
    await session.refresh(db_obj)

    assert db_obj.id is not None
    return TransactionRead(
        id=db_obj.id,
        account_id=db_obj.account_id,
        booking_date=db_obj.booking_date,
        amount=db_obj.amount,
        currency=db_obj.currency,
        payee=db_obj.payee,
        purpose=db_obj.purpose,
        category_id=db_obj.category_id,
        external_id=db_obj.external_id,
        import_source=db_obj.import_source,
        import_hash=db_obj.import_hash,
    )


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    account_id: Annotated[int, Query(ge=1)],
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    date_from: date | None = None,
    date_to: date | None = None,
    category_filter: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> TransactionListResponse:
    filters = [Transaction.account_id == account_id]  # type: ignore[arg-type]
    if date_from is not None:
        filters.append(Transaction.booking_date >= date_from)  # type: ignore[arg-type]
    if date_to is not None:
        filters.append(Transaction.booking_date <= date_to)  # type: ignore[arg-type]
    if category_filter == "uncategorized":
        filters.append(Transaction.category_id.is_(None))  # type: ignore[union-attr]

    count_stmt = select(func.count()).select_from(Transaction).where(*filters)  # type: ignore[arg-type]
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = (
        select(Transaction)
        .where(*filters)  # type: ignore[arg-type]
        .order_by(
            Transaction.booking_date.desc(),  # type: ignore[attr-defined]
            Transaction.id.desc(),  # type: ignore[union-attr]
        )
        .limit(limit)
        .offset(offset)
    )

    res = await session.execute(stmt)
    rows = list(res.scalars().all())

    items: list[TransactionRead] = []
    for row in rows:
        if row.id is None:
            continue
        items.append(
            TransactionRead(
                id=row.id,
                account_id=row.account_id,
                booking_date=row.booking_date,
                amount=row.amount,
                currency=row.currency,
                payee=row.payee,
                purpose=row.purpose,
                category_id=row.category_id,
                external_id=row.external_id,
                import_source=row.import_source,
                import_hash=row.import_hash,
            )
        )

    return TransactionListResponse(items=items, total=total)
