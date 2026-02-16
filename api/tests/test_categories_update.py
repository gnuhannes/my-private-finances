import pytest
from httpx import AsyncClient

from tests.helpers import create_category


@pytest.mark.asyncio
async def test_update_category_name(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")

    res = await test_app.patch(f"/api/categories/{cat['id']}", json={"name": "Food"})
    assert res.status_code == 200
    assert res.json()["name"] == "Food"


@pytest.mark.asyncio
async def test_update_category_parent(test_app: AsyncClient) -> None:
    parent = await create_category(test_app, name="Food")
    child = await create_category(test_app, name="Groceries")

    res = await test_app.patch(
        f"/api/categories/{child['id']}", json={"parent_id": parent["id"]}
    )
    assert res.status_code == 200
    assert res.json()["parent_id"] == parent["id"]


@pytest.mark.asyncio
async def test_update_category_not_found_returns_404(
    test_app: AsyncClient,
) -> None:
    res = await test_app.patch("/api/categories/9999", json={"name": "X"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_category_self_parent_returns_422(
    test_app: AsyncClient,
) -> None:
    cat = await create_category(test_app, name="Groceries")

    res = await test_app.patch(
        f"/api/categories/{cat['id']}", json={"parent_id": cat["id"]}
    )
    assert res.status_code == 422
