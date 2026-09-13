import pytest
from httpx import AsyncClient

from tests.helpers import create_account


@pytest.mark.asyncio
async def test_create_account_returns_201_and_body(test_app: AsyncClient) -> None:
    created = await create_account(test_app, name="Main", currency="EUR")

    assert "id" in created, f"Expected 'id' in response, got: {created}"
    assert isinstance(created["id"], int), f"Expected id to be int, got: {created}"
    assert created["id"] >= 1, f"Expected id >= 1, got: {created}"
    assert created["name"] == "Main", f"Expected name 'Main', got: {created}"
    assert created["currency"] == "EUR", f"Expected currency 'EUR', got: {created}"


@pytest.mark.asyncio
async def test_create_account_accepts_opening_balance(test_app: AsyncClient) -> None:
    resp = await test_app.post(
        "/api/accounts",
        json={
            "name": "Checking",
            "currency": "EUR",
            "opening_balance": "1000.00",
            "opening_balance_date": "2026-01-01",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["opening_balance"] == "1000.00"
    assert body["opening_balance_date"] == "2026-01-01"


@pytest.mark.asyncio
async def test_create_account_opening_balance_is_optional(
    test_app: AsyncClient,
) -> None:
    created = await create_account(test_app, name="Main", currency="EUR")
    assert created["opening_balance"] is None
    assert created["opening_balance_date"] is None


@pytest.mark.asyncio
async def test_create_account_with_opening_balance_appears_in_net_worth(
    test_app: AsyncClient,
) -> None:
    created = await test_app.post(
        "/api/accounts",
        json={
            "name": "Checking",
            "currency": "EUR",
            "opening_balance": "1000.00",
            "opening_balance_date": "2026-01-01",
        },
    )
    assert created.status_code == 201, created.text
    account_id = created.json()["id"]

    resp = await test_app.get("/api/reports/net-worth")
    assert resp.status_code == 200, resp.text
    accounts = resp.json()["accounts"]
    matching = [a for a in accounts if a["account_id"] == account_id]
    assert len(matching) == 1, f"Expected account in net-worth report, got: {accounts}"
    assert matching[0]["opening_balance"] == "1000.00"
