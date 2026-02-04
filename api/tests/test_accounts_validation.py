import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_account_missing_name_returns_422(test_app: AsyncClient) -> None:
    res = await test_app.post("/api/accounts", json={"currency": "EUR"})
    assert res.status_code == 422, res.text


@pytest.mark.asyncio
async def test_create_account_with_unknown_field_returns_422(
    test_app: AsyncClient,
) -> None:
    payload = {"name": "Main", "currency": "EUR", "unknown": "x"}

    res = await test_app.post("/api/accounts", json=payload)
    assert res.status_code == 422, res.text
