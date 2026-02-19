from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_category, create_transaction


async def _categorize(client: AsyncClient, tx_id: int, category_id: int) -> None:
    res = await client.patch(
        f"/api/transactions/{tx_id}", json={"category_id": category_id}
    )
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_spending_trend_basic_averages(test_app: AsyncClient) -> None:
    """3 historical months + partial current month → verify avg and current."""
    acc = await create_account(test_app, name="Main", currency="EUR")
    cat = await create_category(test_app, name="Groceries")

    # 3 lookback months: Nov, Dec, Jan with known amounts
    for month, amount, eid in [
        ("2025-11-05", "-100.00", "t-nov"),
        ("2025-12-05", "-200.00", "t-dec"),
        ("2026-01-05", "-300.00", "t-jan"),
    ]:
        tx = await create_transaction(
            test_app,
            account_id=acc["id"],
            booking_date=month,
            amount=amount,
            external_id=eid,
        )
        await _categorize(test_app, tx["id"], cat["id"])

    # Current month (Feb 2026): €150 so far
    tx_cur = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-02-05",
        amount="-150.00",
        external_id="t-feb",
    )
    await _categorize(test_app, tx_cur["id"], cat["id"])

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["month"] == "2026-02"
    assert body["lookback_months"] == 3
    assert body["currency"] == "EUR"

    cats = body["categories"]
    assert len(cats) == 1
    item = cats[0]
    assert item["category_name"] == "Groceries"

    # avg = (100 + 200 + 300) / 3 = 200.00
    assert item["avg_monthly"] == "200.00"
    # current = 150.00
    assert item["current_month"] == "150.00"
    # projected ≥ current_month (since month is not complete)
    assert float(item["projected"]) >= 150.0


@pytest.mark.asyncio
async def test_spending_trend_multiple_categories(test_app: AsyncClient) -> None:
    """Multiple categories are reported separately and sorted by avg_monthly desc."""
    acc = await create_account(test_app)
    cat_rent = await create_category(test_app, name="Rent")
    cat_food = await create_category(test_app, name="Food")

    # Rent: 3 months at 600
    for month, eid in [
        ("2025-11-01", "r1"),
        ("2025-12-01", "r2"),
        ("2026-01-01", "r3"),
    ]:
        tx = await create_transaction(
            test_app,
            account_id=acc["id"],
            booking_date=month,
            amount="-600.00",
            external_id=eid,
        )
        await _categorize(test_app, tx["id"], cat_rent["id"])

    # Food: 3 months at 100
    for month, eid in [
        ("2025-11-10", "f1"),
        ("2025-12-10", "f2"),
        ("2026-01-10", "f3"),
    ]:
        tx = await create_transaction(
            test_app,
            account_id=acc["id"],
            booking_date=month,
            amount="-100.00",
            external_id=eid,
        )
        await _categorize(test_app, tx["id"], cat_food["id"])

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    cats = body["categories"]
    assert len(cats) == 2
    # Rent has higher avg, comes first
    assert cats[0]["category_name"] == "Rent"
    assert cats[0]["avg_monthly"] == "600.00"
    assert cats[1]["category_name"] == "Food"
    assert cats[1]["avg_monthly"] == "100.00"

    # Totals
    assert body["total_avg_monthly"] == "700.00"


@pytest.mark.asyncio
async def test_spending_trend_excludes_transfers(test_app: AsyncClient) -> None:
    """Transfer transactions must not appear in trend calculations."""
    acc1 = await create_account(test_app, name="Checking")
    acc2 = await create_account(test_app, name="Savings")

    # Normal expense
    await create_transaction(
        test_app,
        account_id=acc1["id"],
        booking_date="2025-11-05",
        amount="-100.00",
        external_id="expense-1",
    )

    # Transfer transaction (is_transfer=True via transfers API or direct)
    # Create two transactions and mark as transfer
    await create_transaction(
        test_app,
        account_id=acc1["id"],
        booking_date="2025-11-10",
        amount="-500.00",
        payee="Savings",
        external_id="transfer-out",
    )
    await create_transaction(
        test_app,
        account_id=acc2["id"],
        booking_date="2025-11-10",
        amount="500.00",
        payee="Checking",
        external_id="transfer-in",
    )
    # Confirm as transfer
    detect_res = await test_app.post("/api/transfers/detect")
    assert detect_res.status_code == 200, detect_res.text
    candidates = await test_app.get("/api/transfers/candidates")
    if candidates.json():
        cand = candidates.json()[0]
        await test_app.post(f"/api/transfers/candidates/{cand['id']}/confirm")

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    # Only the normal €100 expense should count; transfer amounts excluded
    total_avg = float(body["total_avg_monthly"])
    # avg = 100 / 3 ≈ 33.33 (only one lookback month has data)
    assert total_avg < 200, f"Transfer amounts leaked into trend: total_avg={total_avg}"


@pytest.mark.asyncio
async def test_spending_trend_account_filter(test_app: AsyncClient) -> None:
    """account_id filter isolates data to one account."""
    acc1 = await create_account(test_app, name="Checking")
    acc2 = await create_account(test_app, name="Savings")

    for eid, acc_id in [("c1", acc1["id"]), ("s1", acc2["id"])]:
        await create_transaction(
            test_app,
            account_id=acc_id,
            booking_date="2025-11-05",
            amount="-100.00",
            external_id=eid,
        )

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3, "account_id": acc1["id"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["account_id"] == acc1["id"]
    # Only acc1's €100 in lookback, acc2 excluded
    total_avg = float(body["total_avg_monthly"])
    # 100 / 3 ≈ 33.33
    assert abs(total_avg - 100 / 3) < 0.02, f"Expected ~33.33, got {total_avg}"


@pytest.mark.asyncio
async def test_spending_trend_income_excluded(test_app: AsyncClient) -> None:
    """Income (positive amounts) must not appear in trend."""
    acc = await create_account(test_app)

    # Income in lookback months
    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2025-11-05",
        amount="3000.00",
        payee="Employer",
        external_id="income-1",
    )
    # One expense
    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2025-11-15",
        amount="-50.00",
        payee="REWE",
        external_id="expense-1",
    )

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    # total_avg should only reflect the €50 expense
    total_avg = float(body["total_avg_monthly"])
    assert total_avg < 100, f"Income leaked into trend: total_avg={total_avg}"


@pytest.mark.asyncio
async def test_spending_trend_empty_returns_zero(test_app: AsyncClient) -> None:
    """No transactions → all-zero report with empty categories."""
    await create_account(test_app)

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02", "lookback_months": 3},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["categories"] == []
    assert body["total_avg_monthly"] == "0.00"
    assert body["total_current_month"] == "0.00"
    assert body["total_projected"] == "0.00"


@pytest.mark.asyncio
async def test_spending_trend_lookback_default(test_app: AsyncClient) -> None:
    """Default lookback_months is 3."""
    await create_account(test_app)

    res = await test_app.get(
        "/api/reports/spending-trend",
        params={"month": "2026-02"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["lookback_months"] == 3
