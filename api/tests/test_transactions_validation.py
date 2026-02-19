import pytest
from httpx import AsyncClient

from tests.helpers import create_account


@pytest.mark.asyncio
async def test_create_transaction_missing_required_field_returns_422(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    # missing: amount, payee/purpose/external_id
    payload = {
        "account_id": account_id,
        "booking_date": "2026-01-18",
        "currency": "EUR",
        "import_source": "manual",
    }

    res = await test_app.post("/api/transactions", json=payload)
    assert res.status_code == 422, res.text


@pytest.mark.asyncio
async def test_create_transaction_with_typo_field_returns_422(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    payload = {
        "account_id": account_id,
        "booking_date": "2026-01-18",
        "amount": "12.34",
        "currency": "EUR",
        "payee": "Rewe",
        "purpose": "Groceries",
        "import_source": "manual",
        "external_id": "abc-1",
        # intentional typo that must be rejected
        "import_surce": "manual",
    }

    res = await test_app.post("/api/transactions", json=payload)
    assert res.status_code == 422, res.text


@pytest.mark.asyncio
async def test_list_transactions_without_account_id_returns_all(
    test_app: AsyncClient,
) -> None:
    # account_id is now optional — omitting it returns all transactions (all accounts)
    res = await test_app.get("/api/transactions")
    assert res.status_code == 200, res.text
    body = res.json()
    assert "items" in body
    assert "total" in body
