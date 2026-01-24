import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_account(test_app: AsyncClient) -> None:
    res = await test_app.post("/accounts", json={"name": "Main", "currency": "EUR"})
    assert res.status_code == 201
    body = res.json()
    assert body["id"] > 0
    assert body["name"] == "Main"
    assert body["currency"] == "EUR"
