"""Direct-call tests for budget-vs-actual report (registers in pytest-cov)."""

from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.api.routes.reports import _parse_month, get_budget_vs_actual
from my_private_finances.models import Account, Budget, Category, Transaction


def test_parse_month_valid() -> None:
    start, end = _parse_month("2026-05")
    assert start == date(2026, 5, 1)
    assert end == date(2026, 6, 1)


def test_parse_month_december() -> None:
    start, end = _parse_month("2026-12")
    assert start == date(2026, 12, 1)
    assert end == date(2027, 1, 1)


def test_parse_month_invalid_format() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _parse_month("bad")
    assert exc_info.value.status_code == 422


def test_parse_month_invalid_month_number() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _parse_month("2026-13")
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_budget_vs_actual_direct(db_session: AsyncSession) -> None:
    acc = Account(name="Main", currency="EUR")
    db_session.add(acc)
    await db_session.commit()
    await db_session.refresh(acc)

    cat = Category(name="Groceries")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    db_session.add(Budget(category_id=cat.id, amount=Decimal("300.00")))  # type: ignore[arg-type]
    await db_session.commit()

    tx = Transaction(
        account_id=acc.id,  # type: ignore[arg-type]
        booking_date=date(2026, 5, 10),
        amount=Decimal("-120.00"),
        currency="EUR",
        payee="REWE",
        purpose="Food",
        import_source="manual",
        import_hash="hash1",
        category_id=cat.id,  # type: ignore[arg-type]
    )
    db_session.add(tx)
    await db_session.commit()

    result = await get_budget_vs_actual(
        account_id=acc.id,
        month="2026-05",
        session=db_session,  # type: ignore[arg-type]
    )

    assert len(result) == 1
    assert result[0].category_name == "Groceries"
    assert result[0].budgeted == Decimal("300.00")
    assert result[0].actual == Decimal("120.00")
    assert result[0].remaining == Decimal("180.00")


@pytest.mark.asyncio
async def test_budget_vs_actual_account_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_budget_vs_actual(
            account_id=99999, month="2026-05", session=db_session
        )
    assert exc_info.value.status_code == 404
