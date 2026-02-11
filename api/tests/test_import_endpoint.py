from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_account

API_PREFIX = "/api"

VALID_CSV = (
    "booking_date,amount,currency,payee,purpose,external_id\n"
    "2026-01-18,-12.34,EUR,Rewe,Groceries,abc-1\n"
    "2026-01-19,-4.50,EUR,Baecker,Bread,abc-2\n"
)

BAD_CSV = "booking_date,amount,currency\nnot-a-date,xyz,EUR\n"


@pytest.mark.asyncio
async def test_import_csv_creates_transactions(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    resp = await test_app.post(
        f"{API_PREFIX}/imports/csv",
        params={"account_id": account_id},
        files={"file": ("import.csv", VALID_CSV, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_rows"] == 2
    assert body["created"] == 2
    assert body["duplicates"] == 0
    assert body["failed"] == 0
    assert body["errors"] == []


@pytest.mark.asyncio
async def test_import_csv_deduplicates(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    await test_app.post(
        f"{API_PREFIX}/imports/csv",
        params={"account_id": account_id},
        files={"file": ("import.csv", VALID_CSV, "text/csv")},
    )

    resp = await test_app.post(
        f"{API_PREFIX}/imports/csv",
        params={"account_id": account_id},
        files={"file": ("import.csv", VALID_CSV, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_rows"] == 2
    assert body["created"] == 0
    assert body["duplicates"] == 2


@pytest.mark.asyncio
async def test_import_csv_invalid_account(test_app: AsyncClient) -> None:
    resp = await test_app.post(
        f"{API_PREFIX}/imports/csv",
        params={"account_id": 999},
        files={"file": ("import.csv", VALID_CSV, "text/csv")},
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_import_csv_bad_content(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    resp = await test_app.post(
        f"{API_PREFIX}/imports/csv",
        params={"account_id": account_id},
        files={"file": ("bad.csv", BAD_CSV, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["failed"] == 1
    assert body["created"] == 0
    assert len(body["errors"]) == 1
