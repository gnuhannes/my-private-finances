from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from my_private_finances.deps import SessionDep
from my_private_finances.models import Budget, Category
from my_private_finances.schemas import BudgetCreate, BudgetRead, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])


async def _to_read(session: AsyncSession, budget: Budget) -> BudgetRead:
    assert budget.id is not None
    cat = await session.get(Category, budget.category_id)
    category_name = cat.name if cat else "(deleted)"
    return BudgetRead(
        id=budget.id,
        category_id=budget.category_id,
        category_name=category_name,
        amount=budget.amount,
    )


@router.post("", response_model=BudgetRead, status_code=201)
async def create_budget(
    payload: Annotated[BudgetCreate, Body()], session: SessionDep
) -> BudgetRead:
    cat = await session.get(Category, payload.category_id)
    if cat is None:
        raise HTTPException(status_code=422, detail="Category not found")

    db_obj = Budget(category_id=payload.category_id, amount=payload.amount)
    session.add(db_obj)

    try:
        await session.commit()
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="Budget already exists for this category"
        ) from e

    await session.refresh(db_obj)
    return await _to_read(session, db_obj)


@router.get("", response_model=list[BudgetRead])
async def list_budgets(session: SessionDep) -> list[BudgetRead]:
    stmt = (
        select(Budget, Category.name)
        .join(Category, Budget.category_id == Category.id)  # type: ignore[arg-type]
        .order_by(Category.name)  # type: ignore[arg-type]
    )
    rows = (await session.execute(stmt)).all()
    return [
        BudgetRead(
            id=budget.id,  # type: ignore[arg-type]
            category_id=budget.category_id,
            category_name=cat_name,
            amount=budget.amount,
        )
        for budget, cat_name in rows
    ]


@router.patch("/{budget_id}", response_model=BudgetRead)
async def update_budget(
    budget_id: int,
    payload: Annotated[BudgetUpdate, Body()],
    session: SessionDep,
) -> BudgetRead:
    db_obj = await session.get(Budget, budget_id)
    if db_obj is None:
        raise HTTPException(status_code=404, detail="Budget not found")

    if payload.amount is not None:
        db_obj.amount = payload.amount

    await session.commit()
    await session.refresh(db_obj)
    return await _to_read(session, db_obj)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(budget_id: int, session: SessionDep) -> None:
    db_obj = await session.get(Budget, budget_id)
    if db_obj is None:
        raise HTTPException(status_code=404, detail="Budget not found")

    await session.delete(db_obj)
    await session.commit()
