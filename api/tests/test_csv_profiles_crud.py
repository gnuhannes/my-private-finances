from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_account

API = "/api/csv-profiles"


async def _create_profile(
    client: AsyncClient,
    *,
    name: str = "DKB Giro",
    delimiter: str = ";",
    date_format: str = "dmy",
    decimal_comma: bool = False,
    column_map: dict | None = None,
) -> dict:
    payload: dict = {
        "name": name,
        "delimiter": delimiter,
        "date_format": date_format,
        "decimal_comma": decimal_comma,
        "column_map": column_map or {},
    }
    resp = await client.post(API, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_create_and_get_profile(test_app: AsyncClient) -> None:
    profile = await _create_profile(
        test_app,
        name="DKB Giro",
        delimiter=";",
        date_format="dmy",
        decimal_comma=False,
        column_map={"booking_date": ["Buchungstag"], "amount": ["Betrag"]},
    )
    assert profile["id"] is not None
    assert profile["name"] == "DKB Giro"
    assert profile["delimiter"] == ";"
    assert profile["date_format"] == "dmy"
    assert profile["decimal_comma"] is False
    assert profile["column_map"] == {
        "booking_date": ["Buchungstag"],
        "amount": ["Betrag"],
    }

    # Fetch by id
    resp = await test_app.get(f"{API}/{profile['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "DKB Giro"


@pytest.mark.asyncio
async def test_list_profiles(test_app: AsyncClient) -> None:
    await _create_profile(test_app, name="Alpha")
    await _create_profile(test_app, name="Beta")

    resp = await test_app.get(API)
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Alpha" in names
    assert "Beta" in names


@pytest.mark.asyncio
async def test_update_profile(test_app: AsyncClient) -> None:
    profile = await _create_profile(test_app, name="Original")
    profile_id = profile["id"]

    resp = await test_app.put(
        f"{API}/{profile_id}",
        json={"name": "Renamed", "delimiter": "|"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Renamed"
    assert body["delimiter"] == "|"
    assert body["date_format"] == "dmy"  # unchanged


@pytest.mark.asyncio
async def test_delete_profile(test_app: AsyncClient) -> None:
    profile = await _create_profile(test_app, name="ToDelete")
    profile_id = profile["id"]

    resp = await test_app.delete(f"{API}/{profile_id}")
    assert resp.status_code == 204

    resp = await test_app.get(f"{API}/{profile_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_name_returns_409(test_app: AsyncClient) -> None:
    await _create_profile(test_app, name="Unique")
    resp = await test_app.post(
        API,
        json={
            "name": "Unique",
            "delimiter": ",",
            "date_format": "iso",
            "decimal_comma": False,
            "column_map": {},
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_nonexistent_returns_404(test_app: AsyncClient) -> None:
    resp = await test_app.get(f"{API}/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_csv_import_with_profile(test_app: AsyncClient) -> None:
    """Profile settings are applied when profile_id is passed to /api/imports/csv."""
    acc = await create_account(test_app)
    account_id = acc["id"]

    # Create a profile using semicolon + dmy
    profile = await _create_profile(
        test_app,
        name="Bank DE",
        delimiter=";",
        date_format="dmy",
        decimal_comma=True,
        column_map={},
    )

    # A CSV that uses German format (semicolon-delimited, DMY dates, decimal comma)
    csv_content = (
        "booking_date;amount;currency;payee;purpose;external_id\n"
        "18.01.2026;-12,34;EUR;Rewe;Groceries;abc-1\n"
    )

    resp = await test_app.post(
        "/api/imports/csv",
        params={"account_id": account_id, "profile_id": profile["id"]},
        files={"file": ("import.csv", csv_content, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["created"] == 1
    assert body["failed"] == 0

    # Verify the amount was parsed correctly (decimal comma: -12,34 → -12.34)
    txn_resp = await test_app.get(
        "/api/transactions", params={"account_id": account_id}
    )
    items = txn_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["amount"] == "-12.34"
    assert items[0]["booking_date"] == "2026-01-18"


@pytest.mark.asyncio
async def test_csv_import_explicit_params_override_profile(
    test_app: AsyncClient,
) -> None:
    """Explicit query params take precedence over profile defaults."""
    acc = await create_account(test_app)
    account_id = acc["id"]

    # Profile says semicolon, but we pass delimiter=, explicitly → comma wins
    profile = await _create_profile(test_app, name="SemiProfile", delimiter=";")

    csv_content = "booking_date,amount,currency\n2026-01-18,-5.00,EUR\n"
    resp = await test_app.post(
        "/api/imports/csv",
        params={
            "account_id": account_id,
            "profile_id": profile["id"],
            "delimiter": ",",
            "date_format": "iso",
        },
        files={"file": ("import.csv", csv_content, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["created"] == 1
