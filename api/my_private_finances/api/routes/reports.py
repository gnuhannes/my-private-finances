from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.params import Query
from sqlalchemy import func, literal, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.deps import get_session
from my_private_finances.models import Account, Transaction
from my_private_finances.schemas import MonthlyReport, PayeeTotal

router = APIRouter(prefix="/reports", tags=["reports"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _parse_month(value: str) -> tuple[date, date]:
    try:
        year_str, month_str = value.split("-")
        year = int(year_str)
        month = int(month_str)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="month must be in YYYY-MM") from e

    if month < 1 or month > 12:
        raise HTTPException(status_code=422, detail="month must be in [1-12]")

    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


@router.get("/monthly", response_model=MonthlyReport)
async def get_monthly_report(
    account_id: Annotated[int, Query(ge=1)],
    month: Annotated[str, Query(min_length=7, max_length=7)],
    session: SessionDep,
) -> MonthlyReport:
    start, end = _parse_month(month)

    res_acc = await session.execute(select(Account).where(Account.id == account_id))  # type: ignore[arg-type]
    acc = res_acc.scalar_one_or_none()
    if acc is None or acc.id is None:
        raise HTTPException(status_code=404, detail="Account not found")

    tx = cast(Any, Transaction).__table__

    base_filter = (
        (tx.c.account_id == account_id)
        & (tx.c.booking_date >= start)
        & (tx.c.booking_date < end)
    )

    stmt_totals = select(
        func.count(literal(1)).label("tx_count"),
        func.coalesce(func.sum(tx.c.amount), 0).label("net_total"),
        func.coalesce(
            func.sum(case((tx.c.amount > 0, tx.c.amount), else_=0)),
            0,
        ).label("income_total"),
        func.coalesce(
            func.sum(case((tx.c.amount < 0, tx.c.amount), else_=0)),
            0,
        ).label("expense_total"),
    ).where(base_filter)

    totals_row = (await session.execute(stmt_totals)).one()
    tx_count = int(totals_row.tx_count)
    net_total = Decimal(str(totals_row.net_total))
    income_total = Decimal(str(totals_row.income_total))
    expense_total = Decimal(str(totals_row.expense_total))

    stmt_payees = (
        select(
            tx.c.payee,
            func.coalesce(func.sum(tx.c.amount), 0).label("total"),
        )
        .where(base_filter)
        .where(tx.c.amount < 0)
        .group_by(tx.c.payee)
        .order_by(func.sum(tx.c.amount).asc())
        .limit(15)
    )

    payees_rows = (await session.execute(stmt_payees)).all()
    payees = [
        PayeeTotal(payee=r.payee, total=Decimal(str(r.total))) for r in payees_rows
    ]

    return MonthlyReport(
        account_id=account_id,
        month=month,
        currency=acc.currency,
        transactions_count=tx_count,
        income_total=income_total,
        expense_total=expense_total,
        net_total=net_total,
        top_payees=payees,
    )
