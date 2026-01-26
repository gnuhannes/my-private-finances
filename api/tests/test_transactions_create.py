import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_transaction


@pytest.mark.asyncio
async def test_create_and_list_transactions(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    created = await create_transaction(
        test_app, account_id=account_id, external_id="abc-1"
    )
    assert created["account_id"] == account_id
    assert created["amount"] == "12.34"
    assert created["import_hash"]

    res_list = await test_app.get("/transactions", params={"account_id": account_id})
    assert res_list.status_code == 200, res_list.text
    rows = res_list.json()
    assert len(rows) == 1
    assert rows[0]["payee"] == "Rewe"


@pytest.mark.asyncio
async def test_duplicate_transaction_returns_409(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    transaction = {
        "account_id": account_id,
        "booking_date": "2026-01-18",
        "amount": "12.34",
        "currency": "EUR",
        "payee": "Rewe",
        "purpose": "Groceries",
        "import_source": "manual",
        "external_id": "abc-dup",
    }

    r1 = await test_app.post("/transactions", json=transaction)
    assert r1.status_code == 201, r1.text

    r2 = await test_app.post("/transactions", json=transaction)
    assert r2.status_code == 409, r2.text
