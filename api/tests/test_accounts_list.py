import pytest
from httpx import AsyncClient

from tests.helpers import create_account


@pytest.mark.asyncio
async def test_list_accounts_empty_returns_empty_list(test_app: AsyncClient) -> None:
    res = await test_app.get("/accounts")
    assert res.status_code == 200, res.text
    assert res.json() == []


@pytest.mark.asyncio
async def test_list_accounts_returns_created_accounts_in_id_order(
    test_app: AsyncClient,
) -> None:
    a1 = await create_account(test_app, name="A1", currency="EUR")
    a2 = await create_account(test_app, name="A2", currency="EUR")

    res = await test_app.get("/accounts")
    assert res.status_code == 200, res.text
    data = res.json()
    assert [row["id"] for row in data] == [a1["id"], a2["id"]]
    assert [row["name"] for row in data] == ["A1", "A2"]
