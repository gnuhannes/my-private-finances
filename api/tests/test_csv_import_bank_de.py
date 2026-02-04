from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient

from my_private_finances.services.csv_import import import_transactions_from_csv_path
from tests.helpers import create_account


@pytest.mark.asyncio
async def test_csv_import_de_bank_format_is_supported_and_idempotent(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    csv_content = (
        '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";'
        '"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";'
        '"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";'
        '"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"\n'
        '"DE0012345678";"03.02.26";"03.02.26";"Kartenzahlung";"Einkauf";'
        '"";"";"";"";"";"";"REWE";"DE00...";"";"-12,34";"EUR";""\n'
        '"DE0012345678";"04.02.26";"04.02.26";"Gutschrift";"Gehalt";'
        '"";"";"payroll-2026-02";"";"";"";"Employer";"DE00...";"";"2500,00";"EUR";""\n'
    )

    csv_file = tmp_path / "de_bank.csv"
    csv_file.write_text(csv_content, encoding="utf-8")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]

    async with session_factory() as session:  # type: ignore[call-arg]
        res1 = await import_transactions_from_csv_path(
            session=session,
            account_id=account_id,
            csv_path=csv_file,
            delimiter=";",
            date_format="dmy",
            decimal_comma=True,
        )

    assert res1.total_rows == 2, f"Expected 2 total_rows, got {res1}"
    assert res1.created == 2, f"Expected 2 created, got {res1}"
    assert res1.duplicates == 0, f"Expected 0 duplicates, got {res1}"
    assert res1.failed == 0, f"Expected 0 failed, got {res1}"
    assert res1.errors == [], f"Expected no errors, got {res1.errors}"

    # Reimport same file -> duplicates
    async with session_factory() as session:  # type: ignore[call-arg]
        res2 = await import_transactions_from_csv_path(
            session=session,
            account_id=account_id,
            csv_path=csv_file,
            delimiter=";",
            date_format="dmy",
            decimal_comma=True,
        )

    assert res2.total_rows == 2, f"Expected 2 total_rows, got {res2}"
    assert res2.created == 0, f"Expected 0 created on reimport, got {res2}"
    assert res2.duplicates == 2, f"Expected 2 duplicates on reimport, got {res2}"
    assert res2.failed == 0, f"Expected 0 failed, got {res2}"

    # Verify through API
    res_list = await test_app.get(
        "/api/transactions", params={"account_id": account_id}
    )
    assert res_list.status_code == 200, (
        f"Expected 200, got {res_list.status_code}: {res_list.text}"
    )
    rows = res_list.json()

    assert len(rows) == 2, f"Expected 2 transactions in DB, got {len(rows)}: {rows}"

    # Validate essential fields were mapped and parsed correctly
    by_payee = {r.get("payee"): r for r in rows}

    assert "REWE" in by_payee, f"Expected payee 'REWE', got: {rows}"
    rewe = by_payee["REWE"]
    assert rewe["booking_date"] == "2026-02-03", f"Expected 2026-02-03, got: {rewe}"
    assert rewe["amount"] == "-12.34", f"Expected -12.34, got: {rewe}"
    assert rewe["currency"] == "EUR", f"Expected EUR, got: {rewe}"
    assert rewe["purpose"] == "Einkauf", f"Expected purpose 'Einkauf', got: {rewe}"
    assert rewe["import_hash"], f"Expected import_hash to be set, got: {rewe}"

    assert "Employer" in by_payee, f"Expected payee 'Employer', got: {rows}"
    employer = by_payee["Employer"]
    assert employer["booking_date"] == "2026-02-04", (
        f"Expected 2026-02-04, got: {employer}"
    )
    assert employer["amount"] == "2500.00", f"Expected 2500.00, got: {employer}"
    assert employer["currency"] == "EUR", f"Expected EUR, got: {employer}"
    assert employer["external_id"] == "payroll-2026-02", (
        f"Expected external_id payroll-2026-02, got: {employer}"
    )
    assert employer["import_hash"], f"Expected import_hash to be set, got: {employer}"
