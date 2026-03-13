from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from fpdf import FPDF
from httpx import AsyncClient

from my_private_finances.services.pdf_import import import_transactions_from_pdf_path
from tests.helpers import create_account, create_category, create_rule

API_PREFIX = "/api"

# Trade Republic column order
_HEADERS = [
    "Datum",
    "Typ",
    "Beschreibung",
    "Zahlungseingang",
    "Zahlungsausgang",
    "Saldo",
]
_COL_WIDTHS = [25, 30, 55, 32, 32, 26]


def _make_tr_pdf(rows: list[tuple[str, ...]], path: Path) -> None:
    """Write a minimal Trade Republic-style statement PDF to *path*."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=9)

    for header, w in zip(_HEADERS, _COL_WIDTHS):
        pdf.cell(w, 8, header, border=1)
    pdf.ln()

    for row in rows:
        for cell, w in zip(row, _COL_WIDTHS):
            pdf.cell(w, 8, cell, border=1)
        pdf.ln()

    pdf.output(str(path))


# ---------------------------------------------------------------------------
# Service-level tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pdf_import_creates_transactions_and_is_idempotent(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    rows = [
        ("18.01.2026", "Einlage", "Initialer Einzug", "500,00", "", "500,00"),
        ("19.01.2026", "Aktie", "Tesla Kauf", "", "1.234,56", "-734,56"),
        ("20.01.2026", "Dividende", "Apple Dividende", "12,34", "", "-722,22"),
    ]
    pdf_path = tmp_path / "statement.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]

    async with session_factory() as session:
        res1 = await import_transactions_from_pdf_path(
            session=session, account_id=account_id, pdf_path=pdf_path
        )

    assert res1.total_rows == 3, res1
    assert res1.created == 3, res1
    assert res1.duplicates == 0, res1
    assert res1.failed == 0, res1
    assert res1.errors == [], res1

    # Verify transaction fields via the list endpoint
    resp = await test_app.get("/api/transactions", params={"account_id": account_id})
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert len(items) == 3

    by_payee = {item["payee"]: item for item in items}

    # Zahlungseingang → positive amount
    einlage = by_payee["Einlage"]
    assert einlage["booking_date"] == "2026-01-18"
    assert Decimal(einlage["amount"]) == Decimal("500.00")
    assert einlage["purpose"] == "Initialer Einzug"
    assert einlage["currency"] == "EUR"
    assert einlage["import_source"] == "pdf"

    # Zahlungsausgang → negative amount + German thousands separator
    aktie = by_payee["Aktie"]
    assert aktie["booking_date"] == "2026-01-19"
    assert Decimal(aktie["amount"]) == Decimal("-1234.56")
    assert aktie["purpose"] == "Tesla Kauf"

    # Small positive amount
    dividende = by_payee["Dividende"]
    assert Decimal(dividende["amount"]) == Decimal("12.34")

    # Re-import: all rows become duplicates
    async with session_factory() as session:
        res2 = await import_transactions_from_pdf_path(
            session=session, account_id=account_id, pdf_path=pdf_path
        )

    assert res2.created == 0, res2
    assert res2.duplicates == 3, res2
    assert res2.failed == 0, res2


@pytest.mark.asyncio
async def test_pdf_import_malformed_row_counted_as_failed(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    rows = [
        (
            "",
            "Einlage",
            "Fehlende Datum",
            "100,00",
            "",
            "100,00",
        ),  # empty Datum → failed
        ("21.01.2026", "Dividende", "Good row", "50,00", "", "50,00"),
    ]
    pdf_path = tmp_path / "bad.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=account_id, pdf_path=pdf_path
        )

    assert result.total_rows == 2, result
    assert result.created == 1, result
    assert result.failed == 1, result
    assert len(result.errors) == 1


@pytest.mark.asyncio
async def test_pdf_import_invalid_account_raises(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    rows = [("18.01.2026", "Einlage", "Test", "100,00", "", "100,00")]
    pdf_path = tmp_path / "stmt.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        with pytest.raises(ValueError, match="not found"):
            await import_transactions_from_pdf_path(
                session=session, account_id=99999, pdf_path=pdf_path
            )


# ---------------------------------------------------------------------------
# HTTP endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pdf_import_endpoint_creates_transactions(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    rows = [
        ("22.01.2026", "Einlage", "Via HTTP", "250,00", "", "250,00"),
    ]
    pdf_path = tmp_path / "upload.pdf"
    _make_tr_pdf(rows, pdf_path)

    with pdf_path.open("rb") as fh:
        resp = await test_app.post(
            f"{API_PREFIX}/imports/pdf",
            params={"account_id": account_id},
            files={"file": ("statement.pdf", fh, "application/pdf")},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_rows"] == 1
    assert body["created"] == 1
    assert body["duplicates"] == 0
    assert body["failed"] == 0
    assert body["errors"] == []


@pytest.mark.asyncio
async def test_pdf_import_endpoint_invalid_account_returns_404(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    rows = [("23.01.2026", "Einlage", "Test", "100,00", "", "100,00")]
    pdf_path = tmp_path / "stmt.pdf"
    _make_tr_pdf(rows, pdf_path)

    with pdf_path.open("rb") as fh:
        resp = await test_app.post(
            f"{API_PREFIX}/imports/pdf",
            params={"account_id": 99999},
            files={"file": ("statement.pdf", fh, "application/pdf")},
        )

    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_pdf_import_endpoint_missing_account_id_returns_422(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    rows = [("24.01.2026", "Einlage", "Test", "100,00", "", "100,00")]
    pdf_path = tmp_path / "stmt.pdf"
    _make_tr_pdf(rows, pdf_path)

    with pdf_path.open("rb") as fh:
        resp = await test_app.post(
            f"{API_PREFIX}/imports/pdf",
            files={"file": ("statement.pdf", fh, "application/pdf")},
        )

    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Additional service-level edge-case tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pdf_import_no_trade_republic_header_raises(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """A PDF with no recognisable table header raises ValueError."""
    acc = await create_account(test_app)

    # Build a PDF with arbitrary content but no Trade Republic header row
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 10, "This is not a bank statement")
    pdf_path = tmp_path / "no_header.pdf"
    pdf.output(str(pdf_path))

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        with pytest.raises(ValueError, match="No Trade Republic table header"):
            await import_transactions_from_pdf_path(
                session=session,
                account_id=acc["id"],
                pdf_path=pdf_path,
            )


@pytest.mark.asyncio
async def test_pdf_import_row_with_no_amount_counted_as_failed(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """A row where both Zahlungseingang and Zahlungsausgang are empty counts as failed."""
    acc = await create_account(test_app)

    rows = [
        ("25.01.2026", "Einlage", "Good row", "100,00", "", "100,00"),
        (
            "26.01.2026",
            "Unbekannt",
            "No amount",
            "",
            "",
            "0,00",
        ),  # both amount cols empty
    ]
    pdf_path = tmp_path / "no_amount.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session,
            account_id=acc["id"],
            pdf_path=pdf_path,
        )

    assert result.total_rows == 2
    assert result.created == 1
    assert result.failed == 1
    assert len(result.errors) == 1


@pytest.mark.asyncio
async def test_pdf_import_empty_row_skipped(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """Completely empty rows (e.g. page-break artifacts) are not counted."""
    acc = await create_account(test_app)

    rows = [
        ("27.01.2026", "Einlage", "Real row", "50,00", "", "50,00"),
        ("", "", "", "", "", ""),  # empty row — should be skipped
    ]
    pdf_path = tmp_path / "with_empty_row.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session,
            account_id=acc["id"],
            pdf_path=pdf_path,
        )

    assert result.total_rows == 1
    assert result.created == 1
    assert result.failed == 0


@pytest.mark.asyncio
async def test_pdf_import_applies_categorization_rule(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """Transactions matching a rule get category_id set during PDF import."""
    acc = await create_account(test_app)
    cat = await create_category(test_app, name="Income")
    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Einlage",
        category_id=cat["id"],
    )

    rows = [("28.01.2026", "Einlage", "Salary", "2000,00", "", "2000,00")]
    pdf_path = tmp_path / "with_rule.pdf"
    _make_tr_pdf(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session,
            account_id=acc["id"],
            pdf_path=pdf_path,
        )

    assert result.created == 1

    txn_resp = await test_app.get("/api/transactions", params={"account_id": acc["id"]})
    item = txn_resp.json()["items"][0]
    assert item["category_id"] == cat["id"]
