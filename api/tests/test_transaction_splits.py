import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_category, create_transaction

API_PREFIX = "/api"


@pytest.mark.asyncio
async def test_put_splits_happy_path_clears_category(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat_a = await create_category(test_app, name="Rent")
    cat_b = await create_category(test_app, name="Utilities")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    # Give it a simple category first, to prove splitting clears it.
    await test_app.patch(
        f"{API_PREFIX}/transactions/{tx['id']}", json={"category_id": cat_a["id"]}
    )

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat_a["id"], "amount": "100.00", "note": "rent"},
            {"category_id": cat_b["id"], "amount": "20.00"},
        ],
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body) == 2
    assert {row["category_id"] for row in body} == {cat_a["id"], cat_b["id"]}
    assert {row["category_name"] for row in body} == {"Rent", "Utilities"}
    note_row = next(row for row in body if row["category_id"] == cat_a["id"])
    assert note_row["note"] == "rent"

    list_res = await test_app.get(
        f"{API_PREFIX}/transactions", params={"account_id": acc["id"]}
    )
    listed = next(t for t in list_res.json()["items"] if t["id"] == tx["id"])
    assert listed["category_id"] is None
    assert listed["split_count"] == 2


@pytest.mark.asyncio
async def test_put_splits_allows_null_category_for_unassigned_portion(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": None, "amount": "20.00"},
        ],
    )
    assert res.status_code == 200, res.text
    body = res.json()
    unassigned = next(row for row in body if row["category_id"] is None)
    assert unassigned["category_name"] is None


@pytest.mark.asyncio
async def test_put_splits_sum_mismatch_returns_422(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": cat["id"], "amount": "19.99"},
        ],
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_put_splits_requires_at_least_two_rows(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[{"category_id": cat["id"], "amount": "120.00"}],
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_put_splits_unknown_category_returns_422(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": 999999, "amount": "20.00"},
        ],
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_put_splits_rejects_transfer(test_app: AsyncClient) -> None:
    acc_out = await create_account(test_app, name="Bank")
    acc_in = await create_account(test_app, name="Savings")
    cat = await create_category(test_app, name="Rent")

    tx_out = await create_transaction(
        test_app,
        account_id=acc_out["id"],
        amount="-100.00",
        external_id="transfer-out",
    )
    tx_in = await create_transaction(
        test_app,
        account_id=acc_in["id"],
        amount="100.00",
        external_id="transfer-in",
    )

    manual_res = await test_app.post(
        f"{API_PREFIX}/transfers/manual",
        json={"from_transaction_id": tx_out["id"], "to_transaction_id": tx_in["id"]},
    )
    assert manual_res.status_code == 201, manual_res.text

    res = await test_app.put(
        f"{API_PREFIX}/transactions/{tx_out['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "-60.00"},
            {"category_id": cat["id"], "amount": "-40.00"},
        ],
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_splits_after_put(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": cat["id"], "amount": "20.00"},
        ],
    )

    res = await test_app.get(f"{API_PREFIX}/transactions/{tx['id']}/splits")
    assert res.status_code == 200
    assert len(res.json()) == 2


@pytest.mark.asyncio
async def test_get_splits_not_found(test_app: AsyncClient) -> None:
    res = await test_app.get(f"{API_PREFIX}/transactions/99999/splits")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_splits_reverts_to_simple(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": cat["id"], "amount": "20.00"},
        ],
    )

    res = await test_app.delete(f"{API_PREFIX}/transactions/{tx['id']}/splits")
    assert res.status_code == 204

    get_res = await test_app.get(f"{API_PREFIX}/transactions/{tx['id']}/splits")
    assert get_res.json() == []

    list_res = await test_app.get(
        f"{API_PREFIX}/transactions", params={"account_id": acc["id"]}
    )
    listed = next(t for t in list_res.json()["items"] if t["id"] == tx["id"])
    assert listed["category_id"] is None
    assert listed["split_count"] == 0


@pytest.mark.asyncio
async def test_patch_category_on_split_transaction_returns_409(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Rent")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat["id"], "amount": "100.00"},
            {"category_id": cat["id"], "amount": "20.00"},
        ],
    )

    res = await test_app.patch(
        f"{API_PREFIX}/transactions/{tx['id']}", json={"category_id": cat["id"]}
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_category_delete_blocked_when_used_only_in_a_split(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    cat_a = await create_category(test_app, name="Rent")
    cat_b = await create_category(test_app, name="Utilities")
    tx = await create_transaction(test_app, account_id=acc["id"], amount="120.00")

    await test_app.put(
        f"{API_PREFIX}/transactions/{tx['id']}/splits",
        json=[
            {"category_id": cat_a["id"], "amount": "100.00"},
            {"category_id": cat_b["id"], "amount": "20.00"},
        ],
    )

    res = await test_app.delete(f"{API_PREFIX}/categories/{cat_a['id']}")
    assert res.status_code == 409
