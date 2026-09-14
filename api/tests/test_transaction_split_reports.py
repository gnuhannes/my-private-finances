"""Direct-call tests: split transactions attribute correctly to categories in
reports (issue #134, Part B of 160 - transaction splitting).
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import (
    Account,
    Budget,
    Category,
    Transaction,
    TransactionSplit,
)
from my_private_finances.services import reporting

_HASH = 0


async def _account(session: AsyncSession, *, name: str = "Main") -> Account:
    acc = Account(name=name, currency="EUR")
    session.add(acc)
    await session.commit()
    await session.refresh(acc)
    return acc


async def _category(
    session: AsyncSession, name: str, cost_type: str | None = None
) -> Category:
    cat = Category(name=name, cost_type=cost_type)
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return cat


def _tx(
    account_id: int,
    booking_date: date,
    amount: str,
    *,
    category_id: int | None = None,
    payee: str = "Landlord",
) -> Transaction:
    global _HASH
    _HASH += 1
    return Transaction(
        account_id=account_id,
        booking_date=booking_date,
        amount=Decimal(amount),
        currency="EUR",
        payee=payee,
        purpose="p",
        import_source="manual",
        import_hash=f"split-report-{_HASH}",
        category_id=category_id,
    )


async def _split_tx(
    session: AsyncSession,
    account_id: int,
    booking_date: date,
    total_amount: str,
    *,
    parts: list[tuple[int | None, str]],
) -> Transaction:
    """A transaction whose category_id is cleared and replaced by ``parts``
    of ``(category_id, amount)``, mirroring what ``PUT /splits`` does."""
    tx = _tx(account_id, booking_date, total_amount, category_id=None)
    session.add(tx)
    await session.commit()
    await session.refresh(tx)
    for cat_id, amount in parts:
        session.add(
            TransactionSplit(
                transaction_id=tx.id, category_id=cat_id, amount=Decimal(amount)
            )
        )
    await session.commit()
    return tx


@pytest.mark.asyncio
async def test_monthly_report_category_breakdown_includes_split_portions(
    db_session: AsyncSession,
) -> None:
    acc = await _account(db_session)
    assert acc.id is not None
    rent = await _category(db_session, "Rent")
    utilities = await _category(db_session, "Utilities")
    groceries = await _category(db_session, "Groceries")

    # Split: -1200 -> -1000 Rent / -200 Utilities.
    await _split_tx(
        db_session,
        acc.id,
        date(2026, 3, 5),
        "-1200.00",
        parts=[(rent.id, "-1000.00"), (utilities.id, "-200.00")],
    )
    # Unsplit regression: plain categorized transaction, unaffected.
    db_session.add(_tx(acc.id, date(2026, 3, 6), "-42.00", category_id=groceries.id))
    await db_session.commit()

    report = await reporting.monthly_report(
        db_session, month="2026-03", account_id=acc.id
    )
    totals = {row.category_name: row.total for row in report.category_breakdown}
    assert totals["Rent"] == Decimal("-1000.00")
    assert totals["Utilities"] == Decimal("-200.00")
    assert totals["Groceries"] == Decimal("-42.00")
    # top_spendings / top_payees stay per-transaction (full amount, not split).
    assert any(s.amount == Decimal("-1200.00") for s in report.top_spendings)


@pytest.mark.asyncio
async def test_budget_vs_actual_includes_split_portions(
    db_session: AsyncSession,
) -> None:
    acc = await _account(db_session)
    assert acc.id is not None
    rent = await _category(db_session, "Rent")
    db_session.add(Budget(category_id=rent.id, amount=Decimal("1000.00")))
    await db_session.commit()

    other = await _category(db_session, "Other")
    await _split_tx(
        db_session,
        acc.id,
        date(2026, 3, 5),
        "-1200.00",
        parts=[(rent.id, "-900.00"), (other.id, "-300.00")],
    )

    result = await reporting.budget_vs_actual(
        db_session, month="2026-03", account_id=acc.id
    )
    rent_row = next(r for r in result if r.category_id == rent.id)
    assert rent_row.actual == Decimal("900.00")
    assert rent_row.remaining == Decimal("100.00")


@pytest.mark.asyncio
async def test_fixed_vs_variable_includes_split_portions(
    db_session: AsyncSession,
) -> None:
    acc = await _account(db_session)
    assert acc.id is not None
    fixed_cat = await _category(db_session, "Rent", cost_type="fixed")
    variable_cat = await _category(db_session, "Groceries", cost_type="variable")

    await _split_tx(
        db_session,
        acc.id,
        date(2026, 3, 5),
        "-1200.00",
        parts=[(fixed_cat.id, "-1000.00"), (variable_cat.id, "-200.00")],
    )

    report = await reporting.fixed_vs_variable(
        db_session, month="2026-03", account_id=acc.id
    )
    assert report.fixed_total == Decimal("1000.00")
    assert report.variable_total == Decimal("200.00")


@pytest.mark.asyncio
async def test_spending_trend_includes_split_portions(
    db_session: AsyncSession,
) -> None:
    acc = await _account(db_session)
    assert acc.id is not None
    rent = await _category(db_session, "Rent")

    await _split_tx(
        db_session,
        acc.id,
        date(2026, 2, 5),
        "-1200.00",
        parts=[(rent.id, "-1000.00"), (None, "-200.00")],
    )

    report = await reporting.spending_trend(
        db_session, month="2026-02", lookback_months=1, account_id=acc.id
    )
    rent_item = next(c for c in report.categories if c.category_name == "Rent")
    assert rent_item.current_month == Decimal("1000.00")
    unassigned_item = next(c for c in report.categories if c.category_name is None)
    assert unassigned_item.current_month == Decimal("200.00")
