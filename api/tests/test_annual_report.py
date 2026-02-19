from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_transaction


@pytest.mark.asyncio
async def test_annual_report_basic(test_app: AsyncClient) -> None:
    """Income and expenses aggregated correctly per month."""
    acc = await create_account(test_app, name="Main", currency="EUR")
    aid = acc["id"]

    # Jan: €2500 income, €800 expenses → net €1700, savings 68%
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2026-01-05",
        amount="2500.00",
        external_id="j1",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2026-01-20",
        amount="-800.00",
        external_id="j2",
    )

    # Feb: €2500 income, €2500 expenses → net 0, savings 0%
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2026-02-05",
        amount="2500.00",
        external_id="f1",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2026-02-20",
        amount="-2500.00",
        external_id="f2",
    )

    res = await test_app.get("/api/reports/annual", params={"year": 2026})
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["year"] == 2026
    assert body["currency"] == "EUR"
    assert len(body["months"]) == 12

    by_month = {m["month"]: m for m in body["months"]}

    jan = by_month["2026-01"]
    assert jan["income"] == "2500.00"
    assert jan["expenses"] == "800.00"
    assert jan["net"] == "1700.00"
    assert jan["savings_rate"] == "68.00"

    feb = by_month["2026-02"]
    assert feb["income"] == "2500.00"
    assert feb["expenses"] == "2500.00"
    assert feb["net"] == "0.00"
    assert feb["savings_rate"] == "0.00"

    # Empty months are zero
    mar = by_month["2026-03"]
    assert mar["income"] == "0.00"
    assert mar["expenses"] == "0.00"
    assert mar["net"] == "0.00"
    assert mar["savings_rate"] == "0.00"


@pytest.mark.asyncio
async def test_annual_report_totals(test_app: AsyncClient) -> None:
    """Year-level totals and avg_savings_rate are correct."""
    acc = await create_account(test_app)
    aid = acc["id"]

    # Jan: income 1000, expenses 600 → net 400, rate 40%
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2025-01-10",
        amount="1000.00",
        external_id="a1",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2025-01-20",
        amount="-600.00",
        external_id="a2",
    )

    # Mar: income 1000, expenses 200 → net 800, rate 80%
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2025-03-10",
        amount="1000.00",
        external_id="a3",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2025-03-20",
        amount="-200.00",
        external_id="a4",
    )

    res = await test_app.get("/api/reports/annual", params={"year": 2025})
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["total_income"] == "2000.00"
    assert body["total_expenses"] == "800.00"
    assert body["total_net"] == "1200.00"
    # avg_savings_rate = (40 + 80) / 2 = 60.00
    assert body["avg_savings_rate"] == "60.00"


@pytest.mark.asyncio
async def test_annual_report_year_boundary(test_app: AsyncClient) -> None:
    """Transactions from other years must not appear."""
    acc = await create_account(test_app)
    aid = acc["id"]

    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2024-12-31",
        amount="-999.00",
        external_id="b1",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2025-06-15",
        amount="-100.00",
        external_id="b2",
    )
    await create_transaction(
        test_app,
        account_id=aid,
        booking_date="2026-01-01",
        amount="-999.00",
        external_id="b3",
    )

    res = await test_app.get("/api/reports/annual", params={"year": 2025})
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["total_expenses"] == "100.00"


@pytest.mark.asyncio
async def test_annual_report_excludes_transfers(test_app: AsyncClient) -> None:
    """Transfer-flagged transactions must not appear."""
    acc1 = await create_account(test_app, name="Checking")
    acc2 = await create_account(test_app, name="Savings")

    # Normal expense
    await create_transaction(
        test_app,
        account_id=acc1["id"],
        booking_date="2025-06-01",
        amount="-100.00",
        external_id="c1",
    )

    # Create two matching transactions and confirm as transfer
    await create_transaction(
        test_app,
        account_id=acc1["id"],
        booking_date="2025-06-10",
        amount="-500.00",
        payee="Savings",
        external_id="c2",
    )
    await create_transaction(
        test_app,
        account_id=acc2["id"],
        booking_date="2025-06-10",
        amount="500.00",
        payee="Checking",
        external_id="c3",
    )

    await test_app.post("/api/transfers/detect")
    candidates = (await test_app.get("/api/transfers/candidates")).json()
    if candidates:
        await test_app.post(f"/api/transfers/candidates/{candidates[0]['id']}/confirm")

    res = await test_app.get("/api/reports/annual", params={"year": 2025})
    assert res.status_code == 200, res.text
    body = res.json()

    # Only the €100 normal expense; transfer amounts excluded
    assert body["total_expenses"] == "100.00"


@pytest.mark.asyncio
async def test_annual_report_account_filter(test_app: AsyncClient) -> None:
    """account_id filter isolates data to one account."""
    acc1 = await create_account(test_app, name="Checking")
    acc2 = await create_account(test_app, name="Savings")

    await create_transaction(
        test_app,
        account_id=acc1["id"],
        booking_date="2025-06-01",
        amount="-100.00",
        external_id="d1",
    )
    await create_transaction(
        test_app,
        account_id=acc2["id"],
        booking_date="2025-06-01",
        amount="-999.00",
        external_id="d2",
    )

    res = await test_app.get(
        "/api/reports/annual", params={"year": 2025, "account_id": acc1["id"]}
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["account_id"] == acc1["id"]
    assert body["total_expenses"] == "100.00"


@pytest.mark.asyncio
async def test_annual_report_all_twelve_months_returned(test_app: AsyncClient) -> None:
    """Always returns exactly 12 MonthSummary entries."""
    acc = await create_account(test_app)
    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2025-06-01",
        amount="-50.00",
        external_id="e1",
    )

    res = await test_app.get("/api/reports/annual", params={"year": 2025})
    assert res.status_code == 200, res.text
    body = res.json()

    assert len(body["months"]) == 12
    months = [m["month"] for m in body["months"]]
    assert months == [f"2025-{m:02d}" for m in range(1, 13)]


@pytest.mark.asyncio
async def test_annual_report_default_year(test_app: AsyncClient) -> None:
    """Omitting year defaults to current year (returns 200 with 12 months)."""
    await create_account(test_app)

    res = await test_app.get("/api/reports/annual")
    assert res.status_code == 200, res.text
    body = res.json()

    assert len(body["months"]) == 12
    # Year should be current year (2026 at time of writing)
    assert body["year"] >= 2025
