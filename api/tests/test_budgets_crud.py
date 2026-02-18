import pytest
from httpx import AsyncClient

from tests.helpers import create_budget, create_category


@pytest.mark.asyncio
async def test_create_budget(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    budget = await create_budget(test_app, category_id=cat["id"], amount="300.00")

    assert budget["category_id"] == cat["id"]
    assert budget["category_name"] == "Groceries"
    assert budget["amount"] == "300.00"


@pytest.mark.asyncio
async def test_create_budget_duplicate_category_rejected(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    await create_budget(test_app, category_id=cat["id"])

    res = await test_app.post(
        "/api/budgets", json={"category_id": cat["id"], "amount": "500.00"}
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_create_budget_invalid_category(test_app: AsyncClient) -> None:
    res = await test_app.post(
        "/api/budgets", json={"category_id": 99999, "amount": "100.00"}
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_budgets(test_app: AsyncClient) -> None:
    cat1 = await create_category(test_app, name="Groceries")
    cat2 = await create_category(test_app, name="Transport")
    await create_budget(test_app, category_id=cat1["id"], amount="300.00")
    await create_budget(test_app, category_id=cat2["id"], amount="100.00")

    res = await test_app.get("/api/budgets")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    # Ordered by category name
    assert body[0]["category_name"] == "Groceries"
    assert body[1]["category_name"] == "Transport"


@pytest.mark.asyncio
async def test_update_budget(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    budget = await create_budget(test_app, category_id=cat["id"], amount="300.00")

    res = await test_app.patch(
        f"/api/budgets/{budget['id']}", json={"amount": "500.00"}
    )
    assert res.status_code == 200
    assert res.json()["amount"] == "500.00"


@pytest.mark.asyncio
async def test_delete_budget(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    budget = await create_budget(test_app, category_id=cat["id"])

    res = await test_app.delete(f"/api/budgets/{budget['id']}")
    assert res.status_code == 204

    res = await test_app.get("/api/budgets")
    assert len(res.json()) == 0
