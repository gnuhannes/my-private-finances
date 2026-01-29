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
