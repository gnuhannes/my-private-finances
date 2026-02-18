"""Direct-call tests for recurring pattern routes (registers in pytest-cov)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.api.routes.recurring_patterns import (
    get_recurring_summary,
    list_recurring_patterns,
    trigger_detection,
    update_recurring_pattern,
)
from my_private_finances.models import Account, RecurringPattern, Transaction
from my_private_finances.schemas import RecurringPatternUpdate


async def _seed_account(session: AsyncSession) -> Account:
    acc = Account(name="Main", currency="EUR")
    session.add(acc)
    await session.commit()
    await session.refresh(acc)
    return acc


async def _seed_pattern(
    session: AsyncSession, account_id: int, payee: str = "Netflix"
) -> RecurringPattern:
    p = RecurringPattern(
        account_id=account_id,
        payee=payee,
        typical_amount=Decimal("12.99"),
        frequency="monthly",
        confidence=Decimal("0.85"),
        last_seen=date(2026, 6, 5),
        occurrence_count=6,
    )
    session.add(p)
    await session.commit()
    await session.refresh(p)
    return p


@pytest.mark.asyncio
async def test_list_recurring_patterns_empty(db_session: AsyncSession) -> None:
    acc = await _seed_account(db_session)
    result = await list_recurring_patterns(
        account_id=acc.id,
        session=db_session,  # type: ignore[arg-type]
    )
    assert result == []


@pytest.mark.asyncio
async def test_list_recurring_patterns_filters_inactive(
    db_session: AsyncSession,
) -> None:
    acc = await _seed_account(db_session)
    await _seed_pattern(db_session, acc.id, "Netflix")  # type: ignore[arg-type]
    inactive = await _seed_pattern(db_session, acc.id, "Hulu")  # type: ignore[arg-type]
    inactive.is_active = False
    inactive.frequency = "weekly"  # different frequency to avoid unique constraint
    await db_session.commit()

    active_only = await list_recurring_patterns(
        account_id=acc.id,
        session=db_session,  # type: ignore[arg-type]
    )
    assert len(active_only) == 1
    assert active_only[0].payee == "Netflix"

    all_patterns = await list_recurring_patterns(
        account_id=acc.id,
        session=db_session,  # type: ignore[arg-type]
        include_inactive=True,
    )
    assert len(all_patterns) == 2


@pytest.mark.asyncio
async def test_list_patterns_account_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await list_recurring_patterns(account_id=99999, session=db_session)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_recurring_pattern_toggle(db_session: AsyncSession) -> None:
    acc = await _seed_account(db_session)
    p = await _seed_pattern(db_session, acc.id)  # type: ignore[arg-type]

    payload = RecurringPatternUpdate(is_active=False, user_confirmed=True)
    result = await update_recurring_pattern(
        pattern_id=p.id,
        payload=payload,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.is_active is False
    assert result.user_confirmed is True


@pytest.mark.asyncio
async def test_update_pattern_not_found(db_session: AsyncSession) -> None:
    payload = RecurringPatternUpdate(is_active=False)
    with pytest.raises(HTTPException) as exc_info:
        await update_recurring_pattern(
            pattern_id=99999, payload=payload, session=db_session
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_trigger_detection_account_not_found(
    db_session: AsyncSession,
) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await trigger_detection(account_id=99999, session=db_session)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_trigger_detection_with_data(db_session: AsyncSession) -> None:
    acc = await _seed_account(db_session)

    # Seed monthly transactions
    for i in range(6):
        tx = Transaction(
            account_id=acc.id,  # type: ignore[arg-type]
            booking_date=date(2026, 1 + i, 5),
            amount=Decimal("-12.99"),
            currency="EUR",
            payee="Netflix",
            purpose="subscription",
            import_source="manual",
            import_hash=f"det-{i}",
        )
        db_session.add(tx)
    await db_session.commit()

    result = await trigger_detection(
        account_id=acc.id,
        session=db_session,  # type: ignore[arg-type]
    )
    assert len(result) >= 1
    assert result[0].payee == "netflix"


@pytest.mark.asyncio
async def test_get_recurring_summary(db_session: AsyncSession) -> None:
    acc = await _seed_account(db_session)
    await _seed_pattern(db_session, acc.id)  # type: ignore[arg-type]

    result = await get_recurring_summary(
        account_id=acc.id,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.account_id == acc.id
    assert result.pattern_count == 1
    assert result.total_monthly_recurring == Decimal("12.99")
    assert len(result.by_frequency) == 1


@pytest.mark.asyncio
async def test_get_summary_account_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_recurring_summary(account_id=99999, session=db_session)
    assert exc_info.value.status_code == 404
