import pytest
from httpx import AsyncClient

from tests.helpers import create_account


@pytest.mark.asyncio
async def test_list_accounts_empty_returns_empty_list(test_app: AsyncClient) -> None:
    res = await test_app.get("/api/accounts")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json() == [], f"Expected empty list, got: {res.json()}"


@pytest.mark.asyncio
async def test_list_accounts_returns_created_accounts_in_id_order(
    test_app: AsyncClient,
) -> None:
    a1 = await create_account(test_app, name="A1", currency="EUR")
    a2 = await create_account(test_app, name="A2", currency="EUR")

    res = await test_app.get("/api/accounts")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()

    ids = [row["id"] for row in data]
    names = [row["name"] for row in data]
    currencies = [row["currency"] for row in data]

    assert ids == [a1["id"], a2["id"]], (
        f"Expected ids {[a1['id'], a2['id']]}, got {ids}"
    )
    assert names == ["A1", "A2"], f"Expected names ['A1', 'A2'], got {names}"
    assert currencies == ["EUR", "EUR"], (
        f"Expected currencies ['EUR', 'EUR'], got {currencies}"
    )
