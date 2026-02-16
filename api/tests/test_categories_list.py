import pytest
from httpx import AsyncClient

from tests.helpers import create_category


@pytest.mark.asyncio
async def test_list_categories_empty_returns_empty_list(
    test_app: AsyncClient,
) -> None:
    res = await test_app.get("/api/categories")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_list_categories_returns_created_categories_ordered_by_name(
    test_app: AsyncClient,
) -> None:
    await create_category(test_app, name="Transport")
    await create_category(test_app, name="Groceries")

    res = await test_app.get("/api/categories")
    assert res.status_code == 200
    data = res.json()

    names = [row["name"] for row in data]
    assert names == ["Groceries", "Transport"]
