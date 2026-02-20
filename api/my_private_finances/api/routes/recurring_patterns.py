from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Any, cast

from fastapi import APIRouter, Body, HTTPException
from fastapi.params import Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.deps import SessionDep
from my_private_finances.models import Account, Category, RecurringPattern
from my_private_finances.schemas import (
    FrequencyTotal,
    RecurringPatternRead,
    RecurringPatternUpdate,
    RecurringSummary,
)
from my_private_finances.services.recurring_detection import run_detection

router = APIRouter(prefix="/recurring-patterns", tags=["recurring-patterns"])

# Monthly normalization factors for different frequencies
_MONTHLY_FACTOR: dict[str, Decimal] = {
    "weekly": Decimal("4.33"),
    "monthly": Decimal("1"),
    "quarterly": Decimal("0.333"),
    "yearly": Decimal("0.083"),
}


async def _to_read(
    session: AsyncSession, pattern: RecurringPattern
) -> RecurringPatternRead:
    assert pattern.id is not None
    category_name: str | None = None
    if pattern.category_id is not None:
        cat = await session.get(Category, pattern.category_id)
        category_name = cat.name if cat else None
    return RecurringPatternRead(
        id=pattern.id,
        account_id=pattern.account_id,
        payee=pattern.payee,
        typical_amount=pattern.typical_amount,
        frequency=pattern.frequency,
        confidence=pattern.confidence,
        last_seen=pattern.last_seen,
        occurrence_count=pattern.occurrence_count,
        is_active=pattern.is_active,
        user_confirmed=pattern.user_confirmed,
        category_id=pattern.category_id,
        category_name=category_name,
    )


@router.get("", response_model=list[RecurringPatternRead])
async def list_recurring_patterns(
    account_id: Annotated[int, Query(ge=1)],
    session: SessionDep,
    include_inactive: bool = False,
) -> list[RecurringPatternRead]:
    acc = await session.get(Account, account_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Account not found")

    stmt = select(RecurringPattern).where(RecurringPattern.account_id == account_id)  # type: ignore[arg-type]
    if not include_inactive:
        stmt = stmt.where(RecurringPattern.is_active == True)  # type: ignore[arg-type]  # noqa: E712
    stmt = stmt.order_by(RecurringPattern.payee)  # type: ignore[arg-type]

    rows = (await session.execute(stmt)).scalars().all()
    return [await _to_read(session, p) for p in rows]


@router.post("/detect", response_model=list[RecurringPatternRead], status_code=200)
async def trigger_detection(
    account_id: Annotated[int, Query(ge=1)],
    session: SessionDep,
) -> list[RecurringPatternRead]:
    acc = await session.get(Account, account_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Account not found")

    patterns = await run_detection(session, account_id)
    return [await _to_read(session, p) for p in patterns]


@router.patch("/{pattern_id}", response_model=RecurringPatternRead)
async def update_recurring_pattern(
    pattern_id: int,
    payload: Annotated[RecurringPatternUpdate, Body()],
    session: SessionDep,
) -> RecurringPatternRead:
    db_obj = await session.get(RecurringPattern, pattern_id)
    if db_obj is None:
        raise HTTPException(status_code=404, detail="Pattern not found")

    if payload.is_active is not None:
        db_obj.is_active = payload.is_active
    if payload.user_confirmed is not None:
        db_obj.user_confirmed = payload.user_confirmed

    await session.commit()
    await session.refresh(db_obj)
    return await _to_read(session, db_obj)


@router.get("/summary", response_model=RecurringSummary)
async def get_recurring_summary(
    account_id: Annotated[int, Query(ge=1)],
    session: SessionDep,
) -> RecurringSummary:
    acc = await session.get(Account, account_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Account not found")

    rp = cast(Any, RecurringPattern).__table__

    stmt = (
        select(
            rp.c.frequency,
            func.count(rp.c.id).label("pattern_count"),
            func.coalesce(func.sum(rp.c.typical_amount), 0).label("total"),
        )
        .where((rp.c.account_id == account_id) & (rp.c.is_active == True))  # noqa: E712
        .group_by(rp.c.frequency)
    )

    rows = (await session.execute(stmt)).all()

    by_frequency: list[FrequencyTotal] = []
    total_monthly = Decimal("0")
    pattern_count = 0

    for r in rows:
        freq_total = Decimal(str(r.total))
        count = int(r.pattern_count)
        pattern_count += count
        by_frequency.append(
            FrequencyTotal(
                frequency=r.frequency,
                count=count,
                total=freq_total,
            )
        )
        factor = _MONTHLY_FACTOR.get(r.frequency, Decimal("1"))
        total_monthly += freq_total * factor

    return RecurringSummary(
        account_id=account_id,
        total_monthly_recurring=total_monthly.quantize(Decimal("0.01")),
        pattern_count=pattern_count,
        by_frequency=by_frequency,
    )
