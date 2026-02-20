from __future__ import annotations

import json

import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_transaction

_SQLITE_MAGIC = b"SQLite format 3\x00"


@pytest.mark.asyncio
async def test_export_sqlite_returns_valid_file(test_app: AsyncClient) -> None:
    resp = await test_app.get("/api/export/sqlite")
    assert resp.status_code == 200
    assert "attachment" in resp.headers["content-disposition"]
    assert ".sqlite" in resp.headers["content-disposition"]
    assert resp.content[:16] == _SQLITE_MAGIC


@pytest.mark.asyncio
async def test_export_json_structure(test_app: AsyncClient) -> None:
    acc = await create_account(test_app, name="Checking")
    await create_transaction(test_app, account_id=acc["id"], payee="Rewe")

    resp = await test_app.get("/api/export/json")
    assert resp.status_code == 200
    assert "attachment" in resp.headers["content-disposition"]
    assert ".json" in resp.headers["content-disposition"]

    data = json.loads(resp.content)
    assert data["export_version"] == 1
    assert "exported_at" in data
    for key in (
        "accounts",
        "categories",
        "csv_profiles",
        "budgets",
        "categorization_rules",
        "transactions",
        "recurring_patterns",
        "transfer_candidates",
    ):
        assert key in data, f"Missing key: {key}"

    account_names = [a["name"] for a in data["accounts"]]
    assert "Checking" in account_names

    payees = [t["payee"] for t in data["transactions"]]
    assert "Rewe" in payees


@pytest.mark.asyncio
async def test_export_json_decimal_as_string(test_app: AsyncClient) -> None:
    """Amount fields must be serialised as strings, not floats."""
    acc = await create_account(test_app)
    await create_transaction(test_app, account_id=acc["id"], amount="42.99")

    data = json.loads((await test_app.get("/api/export/json")).content)
    tx = data["transactions"][0]
    assert isinstance(tx["amount"], str)
    assert tx["amount"] == "42.99"
