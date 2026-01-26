import pytest
from httpx import AsyncClient

from tests.helpers import create_account


@pytest.mark.asyncio
async def test_create_transaction_missing_required_field_returns_422(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    # missing: amount, payee/purpose/external_id (je nach Schema required)
    payload = {
        "account_id": account_id,
        "booking_date": "2026-01-18",
        "currency": "EUR",
        "import_source": "manual",
    }

    res = await test_app.post("/transactions", json=payload)
    assert res.status_code == 422, res.text


@pytest.mark.asyncio
async def test_list_transactions_without_account_id_returns_422(
    test_app: AsyncClient,
) -> None:
    res = await test_app.get("/transactions")
    assert res.status_code == 422, res.text
