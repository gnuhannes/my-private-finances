import pytest
from httpx import AsyncClient

from tests.helpers import (
    create_account,
    create_budget,
    create_category,
    create_transaction,
)


@pytest.mark.asyncio
async def test_budget_vs_actual_basic(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat_groceries = await create_category(test_app, name="Groceries")
    cat_transport = await create_category(test_app, name="Transport")

    await create_budget(test_app, category_id=cat_groceries["id"], amount="300.00")
    await create_budget(test_app, category_id=cat_transport["id"], amount="100.00")

    # Create spending in May
    tx1 = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-05-01",
        amount="-250.00",
        payee="REWE",
        external_id="bva-1",
    )
    await test_app.patch(
        f"/api/transactions/{tx1['id']}",
        json={"category_id": cat_groceries["id"]},
    )

    tx2 = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-05-05",
        amount="-120.00",
        payee="DB",
        external_id="bva-2",
    )
    await test_app.patch(
        f"/api/transactions/{tx2['id']}",
        json={"category_id": cat_transport["id"]},
    )

    res = await test_app.get(
        "/api/reports/budget-vs-actual",
        params={"account_id": acc["id"], "month": "2026-05"},
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2

    by_name = {c["category_name"]: c for c in body}

    groceries = by_name["Groceries"]
    assert groceries["budgeted"] == "300.00"
    assert groceries["actual"] == "250.00"
    assert groceries["remaining"] == "50.00"

    transport = by_name["Transport"]
    assert transport["budgeted"] == "100.00"
    assert transport["actual"] == "120.00"
    assert transport["remaining"] == "-20.00"


@pytest.mark.asyncio
async def test_budget_vs_actual_no_spending(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    await create_budget(test_app, category_id=cat["id"], amount="300.00")

    res = await test_app.get(
        "/api/reports/budget-vs-actual",
        params={"account_id": acc["id"], "month": "2026-06"},
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["actual"] == "0"
    assert body[0]["remaining"] == "300.00"


@pytest.mark.asyncio
async def test_budget_vs_actual_no_budgets(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)

    res = await test_app.get(
        "/api/reports/budget-vs-actual",
        params={"account_id": acc["id"], "month": "2026-06"},
    )
    assert res.status_code == 200
    assert res.json() == []
