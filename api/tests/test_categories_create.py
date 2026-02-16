import pytest
from httpx import AsyncClient

from tests.helpers import create_category


@pytest.mark.asyncio
async def test_create_category_returns_201_and_body(test_app: AsyncClient) -> None:
    created = await create_category(test_app, name="Groceries")

    assert "id" in created
    assert isinstance(created["id"], int)
    assert created["id"] >= 1
    assert created["name"] == "Groceries"
    assert created["parent_id"] is None


@pytest.mark.asyncio
async def test_create_category_with_parent(test_app: AsyncClient) -> None:
    parent = await create_category(test_app, name="Food")
    child = await create_category(test_app, name="Groceries", parent_id=parent["id"])

    assert child["parent_id"] == parent["id"]


@pytest.mark.asyncio
async def test_create_category_with_invalid_parent_returns_422(
    test_app: AsyncClient,
) -> None:
    res = await test_app.post("/api/categories", json={"name": "X", "parent_id": 9999})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_category_missing_name_returns_422(
    test_app: AsyncClient,
) -> None:
    res = await test_app.post("/api/categories", json={})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_category_with_unknown_field_returns_422(
    test_app: AsyncClient,
) -> None:
    res = await test_app.post(
        "/api/categories", json={"name": "Groceries", "unknown": "x"}
    )
    assert res.status_code == 422
