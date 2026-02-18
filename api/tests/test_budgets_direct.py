"""Direct-call tests for budget routes (registers in pytest-cov)."""

from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.api.routes.budgets import (
    create_budget,
    delete_budget,
    list_budgets,
    update_budget,
)
from my_private_finances.models import Budget, Category
from my_private_finances.schemas import BudgetCreate, BudgetUpdate


async def _seed_category(session: AsyncSession, name: str = "Groceries") -> Category:
    cat = Category(name=name)
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return cat


@pytest.mark.asyncio
async def test_create_budget_direct(db_session: AsyncSession) -> None:
    cat = await _seed_category(db_session)
    payload = BudgetCreate(category_id=cat.id, amount=Decimal("300.00"))  # type: ignore[arg-type]

    result = await create_budget(payload=payload, session=db_session)

    assert result.category_name == "Groceries"
    assert result.amount == Decimal("300.00")


@pytest.mark.asyncio
async def test_create_budget_invalid_category_direct(db_session: AsyncSession) -> None:
    payload = BudgetCreate(category_id=99999, amount=Decimal("100.00"))

    with pytest.raises(HTTPException) as exc_info:
        await create_budget(payload=payload, session=db_session)

    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_create_budget_duplicate_direct(db_session: AsyncSession) -> None:
    cat = await _seed_category(db_session)
    payload = BudgetCreate(category_id=cat.id, amount=Decimal("300.00"))  # type: ignore[arg-type]
    await create_budget(payload=payload, session=db_session)

    with pytest.raises(HTTPException) as exc_info:
        await create_budget(payload=payload, session=db_session)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_list_budgets_direct(db_session: AsyncSession) -> None:
    cat1 = await _seed_category(db_session, "Groceries")
    cat2 = await _seed_category(db_session, "Transport")
    db_session.add(Budget(category_id=cat1.id, amount=Decimal("300.00")))  # type: ignore[arg-type]
    db_session.add(Budget(category_id=cat2.id, amount=Decimal("100.00")))  # type: ignore[arg-type]
    await db_session.commit()

    result = await list_budgets(session=db_session)

    assert len(result) == 2
    assert result[0].category_name == "Groceries"
    assert result[1].category_name == "Transport"


@pytest.mark.asyncio
async def test_update_budget_direct(db_session: AsyncSession) -> None:
    cat = await _seed_category(db_session)
    budget = Budget(category_id=cat.id, amount=Decimal("300.00"))  # type: ignore[arg-type]
    db_session.add(budget)
    await db_session.commit()
    await db_session.refresh(budget)

    payload = BudgetUpdate(amount=Decimal("500.00"))
    result = await update_budget(
        budget_id=budget.id,
        payload=payload,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.amount == Decimal("500.00")


@pytest.mark.asyncio
async def test_update_budget_not_found_direct(db_session: AsyncSession) -> None:
    payload = BudgetUpdate(amount=Decimal("500.00"))

    with pytest.raises(HTTPException) as exc_info:
        await update_budget(budget_id=99999, payload=payload, session=db_session)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_budget_direct(db_session: AsyncSession) -> None:
    cat = await _seed_category(db_session)
    budget = Budget(category_id=cat.id, amount=Decimal("300.00"))  # type: ignore[arg-type]
    db_session.add(budget)
    await db_session.commit()
    await db_session.refresh(budget)

    await delete_budget(budget_id=budget.id, session=db_session)  # type: ignore[arg-type]

    from sqlmodel import select

    result = (await db_session.execute(select(Budget))).scalars().all()
    assert len(result) == 0


@pytest.mark.asyncio
async def test_delete_budget_not_found_direct(db_session: AsyncSession) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await delete_budget(budget_id=99999, session=db_session)

    assert exc_info.value.status_code == 404
