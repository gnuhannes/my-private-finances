import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_transaction


@pytest.mark.asyncio
async def test_list_transactions_empty_for_account(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)

    res = await test_app.get("/transactions", params={"account_id": acc["id"]})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json() == [], f"Expected empty list, got: {res.json()}"


@pytest.mark.asyncio
async def test_list_transactions_only_returns_transactions_for_given_account(
    test_app: AsyncClient,
) -> None:
    acc1 = await create_account(test_app, name="A1")
    acc2 = await create_account(test_app, name="A2")

    tx1 = await create_transaction(test_app, account_id=acc1["id"], external_id="a1-1")
    await create_transaction(test_app, account_id=acc2["id"], external_id="a2-1")

    res = await test_app.get("/transactions", params={"account_id": acc1["id"]})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    rows = res.json()

    ids = [row["id"] for row in rows]
    assert ids == [tx1["id"]], f"Expected only tx id {tx1['id']}, got {ids}"

    for row in rows:
        assert row["account_id"] == acc1["id"], (
            f"Found transaction for wrong account: {row}"
        )


@pytest.mark.asyncio
async def test_list_transactions_ordering_by_booking_date_desc_then_id_desc(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)

    older = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-01",
        external_id="order-1",
    )
    same_day_first = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-03",
        external_id="order-2",
    )
    same_day_second = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-01-03",
        external_id="order-3",
    )

    res = await test_app.get("/transactions", params={"account_id": acc["id"]})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    rows = res.json()

    assert len(rows) == 3, f"Expected 3 rows, got {len(rows)}: {rows}"

    assert rows[2]["id"] == older["id"], (
        f"Expected last row to be oldest tx {older['id']}, got {rows[2]}"
    )

    assert rows[0]["booking_date"] == "2026-01-03", (
        f"Expected first row booking_date 2026-01-03, got {rows[0]}"
    )
    assert rows[1]["booking_date"] == "2026-01-03", (
        f"Expected second row booking_date 2026-01-03, got {rows[1]}"
    )

    assert rows[0]["id"] > rows[1]["id"], (
        f"Expected id desc order, got ids {rows[0]['id']} and {rows[1]['id']}"
    )

    top_ids = {rows[0]["id"], rows[1]["id"]}
    expected_top_ids = {same_day_first["id"], same_day_second["id"]}
    assert top_ids == expected_top_ids, (
        f"Expected top ids {expected_top_ids}, got {top_ids}"
    )
