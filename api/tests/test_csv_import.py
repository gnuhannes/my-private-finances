from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient

from my_private_finances.services.csv_import import import_transactions_from_csv_path
from tests.helpers import create_account


@pytest.mark.asyncio
async def test_csv_import_creates_transactions_and_is_idempotent(
    test_app: AsyncClient,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    csv_content = (
        "booking_date,amount,currency,payee,purpose,external_id\n"
        "2026-01-18,-12.34,EUR,Rewe,Groceries,abc-1\n"
        "2026-01-19,-4.50,EUR,Baecker,Bread,\n"
    )

    tmp_path = Path("tests/_tmp_import.csv")
    tmp_path.write_text(csv_content, encoding="utf-8")
    try:
        session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
        async with session_factory() as session:  # type: ignore[call-arg]
            res1 = await import_transactions_from_csv_path(
                session=session,
                account_id=account_id,
                csv_path=tmp_path,
            )

        assert res1.total_rows == 2, f"Expected 2 total_rows, got {res1}"
        assert res1.created == 2, f"Expected 2 created, got {res1}"
        assert res1.duplicates == 0, f"Expected 0 duplicates, got {res1}"
        assert res1.failed == 0, f"Expected 0 failed, got {res1}"
        assert res1.errors == [], f"Expected no errors, got {res1.errors}"

        async with session_factory() as session:  # type: ignore[call-arg]
            res2 = await import_transactions_from_csv_path(
                session=session,
                account_id=account_id,
                csv_path=tmp_path,
            )

        assert res2.total_rows == 2, f"Expected 2 total_rows, got {res2}"
        assert res2.created == 0, f"Expected 0 created on reimport, got {res2}"
        assert res2.duplicates == 2, f"Expected 2 duplicates on reimport, got {res2}"
        assert res2.failed == 0, f"Expected 0 failed, got {res2}"

        res_list = await test_app.get(
            "/transactions", params={"account_id": account_id}
        )
        assert res_list.status_code == 200, (
            f"Expected 200, got {res_list.status_code}: {res_list.text}"
        )
        rows = res_list.json()
        assert len(rows) == 2, f"Expected 2 transactions in DB, got {len(rows)}: {rows}"

        # Map correctness (don’t depend on ordering too much; find by external_id or payee)
        by_payee = {r.get("payee"): r for r in rows}

        assert "Rewe" in by_payee, (
            f"Expected a transaction with payee='Rewe', got: {rows}"
        )
        rewe = by_payee["Rewe"]
        assert rewe["booking_date"] == "2026-01-18", f"booking_date mismatch: {rewe}"
        assert rewe["amount"] == "-12.34", f"amount mismatch: {rewe}"
        assert rewe["currency"] == "EUR", f"currency mismatch: {rewe}"
        assert rewe["purpose"] == "Groceries", f"purpose mismatch: {rewe}"
        assert rewe["external_id"] == "abc-1", f"external_id mismatch: {rewe}"
        assert rewe["import_hash"], f"import_hash missing: {rewe}"

        # Row with missing external_id should be generated (non-empty)
        other = next(r for r in rows if r["external_id"] != "abc-1")
        assert other["external_id"], f"Expected generated external_id, got: {other}"
        assert other["import_hash"], f"import_hash missing: {other}"

    finally:
        tmp_path.unlink(missing_ok=True)
