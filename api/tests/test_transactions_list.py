import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_transaction


@pytest.mark.asyncio
async def test_list_transactions_empty_for_account(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)

    res = await test_app.get("/transactions", params={"account_id": acc["id"]})
    assert res.status_code == 200, res.text
    assert res.json() == []


@pytest.mark.asyncio
async def test_list_transactions_only_returns_transactions_for_given_account(
    test_app: AsyncClient,
) -> None:
    acc1 = await create_account(test_app, name="A1")
    acc2 = await create_account(test_app, name="A2")

    tx1 = await create_transaction(test_app, account_id=acc1["id"], external_id="a1-1")
    await create_transaction(test_app, account_id=acc2["id"], external_id="a2-1")

    res = await test_app.get("/transactions", params={"account_id": acc1["id"]})
    assert res.status_code == 200, res.text
    rows = res.json()

    assert len(rows) == 1
    assert rows[0]["id"] == tx1["id"]
    assert rows[0]["account_id"] == acc1["id"]


@pytest.mark.asyncio
async def test_list_transactions_ordering_by_booking_date_desc_then_id_desc(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)

    t1 = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-01",
        external_id="order-1",
    )

    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-03",
        external_id="order-2",
    )

    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-03",
        external_id="order-3",
    )

    res = await test_app.get("/transactions", params={"account_id": acc["id"]})
    assert res.status_code == 200, res.text
    rows = res.json()

    assert len(rows) == 3

    assert rows[2]["id"] == t1["id"]
    assert rows[0]["booking_date"] == "2026-01-03"
    assert rows[1]["booking_date"] == "2026-01-03"

    assert rows[0]["id"] > rows[1]["id"]
