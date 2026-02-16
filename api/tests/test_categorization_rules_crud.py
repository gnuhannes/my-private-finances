import pytest
from httpx import AsyncClient

from tests.helpers import create_category, create_rule


@pytest.mark.asyncio
async def test_create_rule_returns_201(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    rule = await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Rewe",
        category_id=cat["id"],
    )

    assert rule["id"] >= 1
    assert rule["position"] == 1
    assert rule["field"] == "payee"
    assert rule["operator"] == "contains"
    assert rule["value"] == "Rewe"
    assert rule["category_id"] == cat["id"]


@pytest.mark.asyncio
async def test_create_rule_auto_increments_position(test_app: AsyncClient) -> None:
    cat = await create_category(test_app, name="Groceries")
    r1 = await create_rule(test_app, value="Rewe", category_id=cat["id"])
    r2 = await create_rule(test_app, value="Aldi", category_id=cat["id"])

    assert r1["position"] == 1
    assert r2["position"] == 2


@pytest.mark.asyncio
async def test_create_rule_invalid_category_returns_422(test_app: AsyncClient) -> None:
    res = await test_app.post(
        "/api/categorization-rules",
        json={
            "field": "payee",
            "operator": "contains",
            "value": "X",
            "category_id": 9999,
        },
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_rule_unknown_field_returns_422(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    res = await test_app.post(
        "/api/categorization-rules",
        json={
            "field": "unknown",
            "operator": "contains",
            "value": "X",
            "category_id": cat["id"],
        },
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_rules_empty(test_app: AsyncClient) -> None:
    res = await test_app.get("/api/categorization-rules")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_list_rules_ordered_by_position(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    await create_rule(test_app, value="Rewe", category_id=cat["id"])
    await create_rule(test_app, value="Aldi", category_id=cat["id"])

    res = await test_app.get("/api/categorization-rules")
    data = res.json()
    assert [r["value"] for r in data] == ["Rewe", "Aldi"]
    assert [r["position"] for r in data] == [1, 2]


@pytest.mark.asyncio
async def test_update_rule(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    rule = await create_rule(test_app, value="Rewe", category_id=cat["id"])

    res = await test_app.patch(
        f"/api/categorization-rules/{rule['id']}", json={"value": "EDEKA"}
    )
    assert res.status_code == 200
    assert res.json()["value"] == "EDEKA"


@pytest.mark.asyncio
async def test_update_rule_not_found(test_app: AsyncClient) -> None:
    res = await test_app.patch("/api/categorization-rules/9999", json={"value": "X"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_rule(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    rule = await create_rule(test_app, value="Rewe", category_id=cat["id"])

    res = await test_app.delete(f"/api/categorization-rules/{rule['id']}")
    assert res.status_code == 204

    list_res = await test_app.get("/api/categorization-rules")
    assert list_res.json() == []


@pytest.mark.asyncio
async def test_delete_rule_not_found(test_app: AsyncClient) -> None:
    res = await test_app.delete("/api/categorization-rules/9999")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_reorder_rules(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    r1 = await create_rule(test_app, value="Rewe", category_id=cat["id"])
    r2 = await create_rule(test_app, value="Aldi", category_id=cat["id"])

    # Reverse order
    res = await test_app.put(
        "/api/categorization-rules/reorder",
        json={"rule_ids": [r2["id"], r1["id"]]},
    )
    assert res.status_code == 200
    data = res.json()
    assert [r["id"] for r in data] == [r2["id"], r1["id"]]
    assert [r["position"] for r in data] == [1, 2]


@pytest.mark.asyncio
async def test_reorder_rules_missing_ids_returns_422(test_app: AsyncClient) -> None:
    cat = await create_category(test_app)
    r1 = await create_rule(test_app, value="Rewe", category_id=cat["id"])

    res = await test_app.put(
        "/api/categorization-rules/reorder",
        json={"rule_ids": [r1["id"], 9999]},
    )
    assert res.status_code == 422
