from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.params import Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.deps import SessionDep
from my_private_finances.models import Category, Transaction, TransactionSplit
from my_private_finances.schemas import (
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionSplitItem,
    TransactionSplitRead,
    TransactionUpdate,
)
from my_private_finances.services.transaction_hash import HashInput, compute_import_hash
from my_private_finances.utils.db_helpers import get_account_or_404

router = APIRouter(prefix="/transactions", tags=["transactions"])


async def _count_splits(session: AsyncSession, transaction_id: int) -> int:
    res = await session.execute(
        select(func.count())
        .select_from(TransactionSplit)
        .where(TransactionSplit.transaction_id == transaction_id)  # type: ignore[arg-type]
    )
    return res.scalar_one()


async def _category_name_map(
    session: AsyncSession, category_ids: set[int]
) -> dict[int, str]:
    if not category_ids:
        return {}
    stmt = select(Category.id, Category.name).where(  # type: ignore[call-overload]
        Category.id.in_(category_ids)  # type: ignore[union-attr]
    )
    res = await session.execute(stmt)
    return {cid: name for cid, name in res.all()}


@router.post("", response_model=TransactionRead, status_code=201)
async def create_transaction(
    tx: TransactionCreate,
    session: SessionDep,
) -> TransactionRead:
    await get_account_or_404(session, tx.account_id)

    if tx.category_id is not None:
        if await session.get(Category, tx.category_id) is None:
            raise HTTPException(status_code=422, detail="Category not found")

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

    return TransactionRead.model_validate(db_obj)


@router.patch("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    session: SessionDep,
) -> TransactionRead:
    db_obj = await session.get(Transaction, transaction_id)
    if db_obj is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    fields = payload.model_dump(exclude_unset=True)

    if "category_id" in fields:
        if await _count_splits(session, transaction_id) > 0:
            raise HTTPException(
                status_code=409,
                detail="Transaction is split; delete splits first",
            )
        category_id = fields["category_id"]
        if category_id is not None and await session.get(Category, category_id) is None:
            raise HTTPException(status_code=422, detail="Category not found")
        db_obj.category_id = category_id

    await session.commit()
    await session.refresh(db_obj)

    split_count = await _count_splits(session, transaction_id)
    return TransactionRead.model_validate(db_obj).model_copy(
        update={"split_count": split_count}
    )


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    account_id: Annotated[Optional[int], Query(ge=1)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    category_filter: str | None = None,
    q: str | None = None,
    amount_min: Decimal | None = None,
    amount_max: Decimal | None = None,
) -> TransactionListResponse:
    filters: list[Any] = []
    if account_id is not None:
        filters.append(Transaction.account_id == account_id)  # type: ignore[arg-type]
    if date_from is not None:
        filters.append(Transaction.booking_date >= date_from)  # type: ignore[arg-type]
    if date_to is not None:
        filters.append(Transaction.booking_date <= date_to)  # type: ignore[arg-type]
    if category_filter is not None:
        if category_filter == "uncategorized":
            filters.append(Transaction.category_id.is_(None))  # type: ignore[union-attr]
        elif category_filter.isdigit():
            filters.append(Transaction.category_id == int(category_filter))  # type: ignore[arg-type]
        else:
            raise HTTPException(
                status_code=422,
                detail="category_filter must be 'uncategorized' or a category id",
            )
    if q is not None:
        filters.append(
            or_(
                Transaction.payee.ilike(f"%{q}%"),  # type: ignore[union-attr]
                Transaction.purpose.ilike(f"%{q}%"),  # type: ignore[union-attr]
            )
        )
    if amount_min is not None:
        filters.append(Transaction.amount >= amount_min)  # type: ignore[arg-type]
    if amount_max is not None:
        filters.append(Transaction.amount <= amount_max)  # type: ignore[arg-type]

    count_stmt = select(func.count()).select_from(Transaction).where(*filters)  # type: ignore[arg-type]
    total = (await session.execute(count_stmt)).scalar_one()

    split_count_subq = (
        select(func.count())
        .select_from(TransactionSplit)
        .where(TransactionSplit.transaction_id == Transaction.id)  # type: ignore[arg-type]
        .correlate(Transaction)
        .scalar_subquery()
    )

    stmt = (
        select(Transaction, split_count_subq.label("split_count"))
        .where(*filters)  # type: ignore[arg-type]
        .order_by(
            Transaction.booking_date.desc(),  # type: ignore[attr-defined]
            Transaction.id.desc(),  # type: ignore[union-attr]
        )
        .limit(limit)
        .offset(offset)
    )

    res = await session.execute(stmt)
    items = [
        TransactionRead.model_validate(row).model_copy(
            update={"split_count": split_count}
        )
        for row, split_count in res.all()
    ]

    return TransactionListResponse(items=items, total=total)


@router.get("/{transaction_id}/splits", response_model=list[TransactionSplitRead])
async def get_transaction_splits(
    transaction_id: int,
    session: SessionDep,
) -> list[TransactionSplitRead]:
    if await session.get(Transaction, transaction_id) is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    stmt = (
        select(TransactionSplit, Category.name)  # type: ignore[call-overload]
        .join(Category, TransactionSplit.category_id == Category.id, isouter=True)  # type: ignore[arg-type]
        .where(TransactionSplit.transaction_id == transaction_id)  # type: ignore[arg-type]
        .order_by(TransactionSplit.id)  # type: ignore[union-attr]
    )
    rows = (await session.execute(stmt)).all()

    return [
        TransactionSplitRead.model_validate(split).model_copy(
            update={"category_name": category_name}
        )
        for split, category_name in rows
    ]


@router.put("/{transaction_id}/splits", response_model=list[TransactionSplitRead])
async def replace_transaction_splits(
    transaction_id: int,
    payload: list[TransactionSplitItem],
    session: SessionDep,
) -> list[TransactionSplitRead]:
    tx = await session.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.is_transfer:
        raise HTTPException(status_code=422, detail="Transfers cannot be split")

    if len(payload) < 2:
        raise HTTPException(status_code=422, detail="A split requires at least 2 rows")

    total = sum((item.amount for item in payload), Decimal("0"))
    if total != tx.amount:
        raise HTTPException(
            status_code=422,
            detail="Split amounts must sum exactly to the transaction amount",
        )

    category_ids = {
        item.category_id for item in payload if item.category_id is not None
    }
    if category_ids:
        found_stmt = select(Category.id).where(  # type: ignore[call-overload]
            Category.id.in_(category_ids)  # type: ignore[union-attr]
        )
        res = await session.execute(found_stmt)
        missing = category_ids - set(res.scalars().all())
        if missing:
            raise HTTPException(status_code=422, detail="Category not found")

    await session.execute(
        delete(TransactionSplit).where(
            TransactionSplit.transaction_id == transaction_id  # type: ignore[arg-type]
        )
    )

    new_splits = [
        TransactionSplit(
            transaction_id=transaction_id,
            category_id=item.category_id,
            amount=item.amount,
            note=item.note,
        )
        for item in payload
    ]
    session.add_all(new_splits)
    tx.category_id = None

    await session.commit()

    for split in new_splits:
        await session.refresh(split)

    category_names = await _category_name_map(session, category_ids)
    return [
        TransactionSplitRead.model_validate(split).model_copy(
            update={
                "category_name": category_names.get(split.category_id)
                if split.category_id is not None
                else None
            }
        )
        for split in new_splits
    ]


@router.delete("/{transaction_id}/splits", status_code=204)
async def delete_transaction_splits(
    transaction_id: int,
    session: SessionDep,
) -> None:
    tx = await session.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await session.execute(
        delete(TransactionSplit).where(
            TransactionSplit.transaction_id == transaction_id  # type: ignore[arg-type]
        )
    )
    tx.category_id = None
    await session.commit()
