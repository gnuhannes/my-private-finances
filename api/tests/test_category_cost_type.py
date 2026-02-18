"""Direct-call tests for category cost_type feature."""

from __future__ import annotations

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.api.routes.categories import (
    create_category,
    list_categories,
    update_category,
)
from my_private_finances.models import Category
from my_private_finances.schemas import CategoryCreate, CategoryUpdate


@pytest.mark.asyncio
async def test_create_category_with_cost_type(db_session: AsyncSession) -> None:
    payload = CategoryCreate(name="Rent", cost_type="fixed")
    result = await create_category(category=payload, session=db_session)

    assert result.name == "Rent"
    assert result.cost_type == "fixed"


@pytest.mark.asyncio
async def test_create_category_without_cost_type(db_session: AsyncSession) -> None:
    payload = CategoryCreate(name="Groceries")
    result = await create_category(category=payload, session=db_session)

    assert result.name == "Groceries"
    assert result.cost_type is None


@pytest.mark.asyncio
async def test_update_category_set_cost_type(db_session: AsyncSession) -> None:
    cat = Category(name="Internet")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    payload = CategoryUpdate(cost_type="fixed")
    result = await update_category(
        category_id=cat.id,
        payload=payload,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.cost_type == "fixed"


@pytest.mark.asyncio
async def test_update_category_clear_cost_type(db_session: AsyncSession) -> None:
    cat = Category(name="Internet", cost_type="fixed")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    # Explicitly send cost_type=None to clear it
    payload = CategoryUpdate.model_validate({"cost_type": None})
    result = await update_category(
        category_id=cat.id,
        payload=payload,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.cost_type is None


@pytest.mark.asyncio
async def test_update_category_without_cost_type_preserves(
    db_session: AsyncSession,
) -> None:
    cat = Category(name="Internet", cost_type="fixed")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    # Don't send cost_type at all — should preserve existing value
    payload = CategoryUpdate(name="DSL")
    result = await update_category(
        category_id=cat.id,
        payload=payload,
        session=db_session,  # type: ignore[arg-type]
    )

    assert result.name == "DSL"
    assert result.cost_type == "fixed"


def test_category_create_rejects_invalid_cost_type() -> None:
    with pytest.raises(ValidationError):
        CategoryCreate(name="Test", cost_type="unknown")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_list_categories_includes_cost_type(db_session: AsyncSession) -> None:
    db_session.add(Category(name="Rent", cost_type="fixed"))
    db_session.add(Category(name="Groceries", cost_type="variable"))
    await db_session.commit()

    result = await list_categories(session=db_session)

    assert len(result) == 2
    by_name = {c.name: c for c in result}
    assert by_name["Rent"].cost_type == "fixed"
    assert by_name["Groceries"].cost_type == "variable"
