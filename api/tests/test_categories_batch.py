from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_category


@pytest.mark.asyncio
async def test_create_categories_batch_happy_path(test_app: AsyncClient) -> None:
    resp = await test_app.post(
        "/api/categories/batch",
        json=[
            {"name": "Rent", "cost_type": "fixed"},
            {"name": "Groceries", "cost_type": "variable"},
        ],
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert len(body) == 2
    assert {c["name"] for c in body} == {"Rent", "Groceries"}
    assert all(c["id"] for c in body)


@pytest.mark.asyncio
async def test_create_categories_batch_with_parent(test_app: AsyncClient) -> None:
    parent = await create_category(test_app, name="Food")

    resp = await test_app.post(
        "/api/categories/batch",
        json=[{"name": "Dining", "parent_id": parent["id"]}],
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()[0]["parent_id"] == parent["id"]


@pytest.mark.asyncio
async def test_create_categories_batch_rollback_on_bad_parent_id(
    test_app: AsyncClient,
) -> None:
    resp = await test_app.post(
        "/api/categories/batch",
        json=[
            {"name": "Rent", "cost_type": "fixed"},
            {"name": "Bad", "parent_id": 9999},
        ],
    )
    assert resp.status_code == 422, resp.text

    listing = await test_app.get("/api/categories")
    assert listing.json() == [], "batch failure must not persist any rows"


@pytest.mark.asyncio
async def test_create_categories_batch_empty_list(test_app: AsyncClient) -> None:
    resp = await test_app.post("/api/categories/batch", json=[])
    assert resp.status_code == 201, resp.text
    assert resp.json() == []
