import pytest
from httpx import AsyncClient

from my_private_finances.models import MLModelState
from tests.helpers import create_account, create_category, create_transaction


@pytest.mark.asyncio
async def test_patch_transaction_sets_category_bumps_retrain_counter(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    tx = await create_transaction(test_app, account_id=acc["id"])

    res = await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat["id"]}
    )
    assert res.status_code == 200

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        state = await session.get(MLModelState, 1)
        assert state is not None
        assert state.categorizations_since_train == 1


@pytest.mark.asyncio
async def test_patch_transaction_recategorize_does_not_double_count(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat_a = await create_category(test_app, name="Groceries")
    cat_b = await create_category(test_app, name="Transport")
    tx = await create_transaction(test_app, account_id=acc["id"])

    await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat_a["id"]}
    )
    # Already categorized -> re-categorizing should NOT bump the counter again.
    await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat_b["id"]}
    )

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        state = await session.get(MLModelState, 1)
        assert state is not None
        assert state.categorizations_since_train == 1


@pytest.mark.asyncio
async def test_patch_transaction_sets_category(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    tx = await create_transaction(test_app, account_id=acc["id"])

    res = await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat["id"]}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["category_id"] == cat["id"]
    assert body["id"] == tx["id"]


@pytest.mark.asyncio
async def test_patch_transaction_clears_category(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    tx = await create_transaction(test_app, account_id=acc["id"])

    # Set category first
    await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat["id"]}
    )

    # Clear it
    res = await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": None}
    )
    assert res.status_code == 200
    assert res.json()["category_id"] is None


@pytest.mark.asyncio
async def test_patch_transaction_empty_body_keeps_category(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    tx = await create_transaction(test_app, account_id=acc["id"])
    await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": cat["id"]}
    )

    res = await test_app.patch(f"/api/transactions/{tx['id']}", json={})
    assert res.status_code == 200
    assert res.json()["category_id"] == cat["id"]


@pytest.mark.asyncio
async def test_patch_transaction_not_found(test_app: AsyncClient) -> None:
    res = await test_app.patch("/api/transactions/99999", json={"category_id": None})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_patch_transaction_invalid_category(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    tx = await create_transaction(test_app, account_id=acc["id"])

    res = await test_app.patch(
        f"/api/transactions/{tx['id']}", json={"category_id": 99999}
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_transactions_uncategorized_filter(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")

    tx_uncat = await create_transaction(
        test_app, account_id=acc["id"], external_id="uncat-1"
    )
    tx_cat = await create_transaction(
        test_app, account_id=acc["id"], external_id="cat-1"
    )

    # Categorize one transaction
    await test_app.patch(
        f"/api/transactions/{tx_cat['id']}", json={"category_id": cat["id"]}
    )

    # Without filter: both returned
    res = await test_app.get("/api/transactions", params={"account_id": acc["id"]})
    assert res.status_code == 200
    assert res.json()["total"] == 2

    # With uncategorized filter: only uncategorized
    res = await test_app.get(
        "/api/transactions",
        params={"account_id": acc["id"], "category_filter": "uncategorized"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == tx_uncat["id"]


@pytest.mark.asyncio
async def test_list_transactions_uncategorized_filter_excludes_split(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat_a = await create_category(test_app, name="Rent")
    cat_b = await create_category(test_app, name="Utilities")

    tx_uncat = await create_transaction(
        test_app, account_id=acc["id"], external_id="uncat-split-1"
    )
    tx_split = await create_transaction(
        test_app, account_id=acc["id"], external_id="split-1", amount="120.00"
    )
    put_res = await test_app.put(
        f"/api/transactions/{tx_split['id']}/splits",
        json=[
            {"category_id": cat_a["id"], "amount": "100.00"},
            {"category_id": cat_b["id"], "amount": "20.00"},
        ],
    )
    assert put_res.status_code == 200, put_res.text

    # tx_split now has category_id == None but shouldn't count as
    # "uncategorized" — it's categorized via its splits instead.
    res = await test_app.get(
        "/api/transactions",
        params={"account_id": acc["id"], "category_filter": "uncategorized"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == tx_uncat["id"]
