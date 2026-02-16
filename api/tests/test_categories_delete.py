import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_category


@pytest.mark.asyncio
async def test_delete_category_returns_204(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")

    res = await test_app.delete(f"/api/categories/{cat['id']}")
    assert res.status_code == 204

    # Verify it's gone
    list_res = await test_app.get("/api/categories")
    assert list_res.json() == []


@pytest.mark.asyncio
async def test_delete_category_not_found_returns_404(
    test_app: AsyncClient,
) -> None:
    res = await test_app.delete("/api/categories/9999")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_category_in_use_returns_409(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    account = await create_account(test_app)

    # Create a transaction that references the category
    tx_payload = {
        "account_id": account["id"],
        "booking_date": "2026-01-15",
        "amount": "42.00",
        "currency": "EUR",
        "payee": "Rewe",
        "purpose": "Weekly groceries",
        "import_source": "manual",
        "external_id": "del-test-1",
        "category_id": cat["id"],
    }
    tx_res = await test_app.post("/api/transactions", json=tx_payload)
    assert tx_res.status_code == 201, tx_res.text

    res = await test_app.delete(f"/api/categories/{cat['id']}")
    assert res.status_code == 409
