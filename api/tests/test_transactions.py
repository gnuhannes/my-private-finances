import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_transactions(test_app: AsyncClient):
    acc = await test_app.post("/accounts", json={"name": "Main", "currency": "EUR"})
    account_id = acc.json()["id"]

    transaction = {
        "account_id": account_id,
        "booking_date": "2026-01-18",
        "amount": "12.34",
        "currency": "EUR",
        "payee": "Rewe",
        "purpose": "Groceries",
        "import_source": "manual",
        "external_id": "abc-1",
    }
    res = await test_app.post("/transactions", json=transaction)
    assert res.status_code == 201
    body = res.json()
    assert body["account_id"] == account_id
    assert body["amount"] == "12.34"
    assert body["import_hash"]

    res_list = await test_app.get("/transactions", params={"account_id": account_id})
    assert res_list.status_code == 200
    rows = res_list.json()
    assert len(rows) == 1
    assert rows[0]["payee"] == "Rewe"


@pytest.mark.asyncio
async def test_duplicate_transaction_returns_409(test_app: AsyncClient) -> None:
    acc = await test_app.post("/accounts", json={"name": "Main", "currency": "EUR"})
    account_id = acc.json()["id"]

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
    assert r1.status_code == 201

    r2 = await test_app.post("/transactions", json=transaction)
    assert r2.status_code == 409
