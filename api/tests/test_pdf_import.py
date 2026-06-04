from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from fpdf import FPDF
from httpx import AsyncClient

from my_private_finances.services.pdf_import import import_transactions_from_pdf_path
from tests.helpers import create_account, create_category, create_rule

API_PREFIX = "/api"

# ── pt→mm conversion (FPDF uses mm, pdfplumber reports pt) ───────────────────
_PT_TO_MM = 1 / 2.8346  # 1pt ≈ 0.3528mm

# ── New-format column x-positions (pt) per real TR Kontoauszug ───────────────
# Amount-side columns must match real TR positions for correct IN/OUT split.
# DATUM→TYP gap is widened vs. real (110pt) to ensure long German month names
# ("Oktober", "September") don't bleed into the TYP column in synthetic PDFs.
_NF_DATUM_PT = 74
_NF_TYP_PT = 155  # wider than real 110pt to accommodate long month names
_NF_DESC_PT = 220  # shifted right proportionally
_NF_MERGED_PT = 340  # ZAHLUNGSEINGANGZAHLUNGSAUSGANG x0 — keep at real position
_NF_SALDO_PT = 480
_NF_IN_AMT_PT = 369  # incoming amount x
_NF_OUT_AMT_PT = 423  # outgoing amount x


def _make_tr_pdf_new_format(
    rows: list[tuple[str, str, str, str, str]],
    path: Path,
    *,
    include_false_datum: bool = False,
    noise_date_cell: str | None = None,
) -> None:
    """Create a borderless (new-format) TR PDF with merged ZAHLUNGSEINGANGZAHLUNGSAUSGANG header.

    Each row is (date, typ, desc, in_amt, out_amt) where exactly one of in_amt/out_amt
    is non-empty.  Dates should use German abbreviated format, e.g. '8 Jan. 2026'.
    Uses 5pt font so the wide merged header word does not overlap with SALDO.
    """
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=5)

    def px(pt: float, y_mm: float, text: str) -> None:
        pdf.set_xy(pt * _PT_TO_MM, y_mm)
        pdf.cell(0, 3, text)

    # Page header: false DATUM at x≈389pt — must NOT trigger header detection
    if include_false_datum:
        px(_NF_DATUM_PT + 315, 15, "DATUM")

    # True table header (no borders)
    for text, pt_x in [
        ("DATUM", _NF_DATUM_PT),
        ("TYP", _NF_TYP_PT),
        ("BESCHREIBUNG", _NF_DESC_PT),
        ("ZAHLUNGSEINGANGZAHLUNGSAUSGANG", _NF_MERGED_PT),
        ("SALDO", _NF_SALDO_PT),
    ]:
        px(pt_x, 25, text)

    y_mm = 35.0
    for date, typ, desc, in_amt, out_amt in rows:
        for text, pt_x in [
            (date, _NF_DATUM_PT),
            (typ, _NF_TYP_PT),
            (desc, _NF_DESC_PT),
        ]:
            if text:
                px(pt_x, y_mm, text)
        if in_amt:
            px(_NF_IN_AMT_PT, y_mm, in_amt)
        if out_amt:
            px(_NF_OUT_AMT_PT, y_mm, out_amt)
        y_mm += 10.0

    # Optional noise row: text placed at DATUM x — should be silently skipped
    if noise_date_cell is not None:
        px(_NF_DATUM_PT, y_mm, noise_date_cell)

    pdf.output(str(path))


# Trade Republic column order
_HEADERS = [
    "Datum",
    "Typ",
    "Beschreibung",
    "Zahlungseingang",
    "Zahlungsausgang",
    "Saldo",
]
_HEADERS_UPPER = [h.upper() for h in _HEADERS]
_COL_WIDTHS = [25, 30, 55, 32, 32, 26]


def _make_tr_pdf(
    rows: list[tuple[str, ...]], path: Path, *, uppercase_headers: bool = False
) -> None:
    """Write a minimal Trade Republic-style statement PDF to *path*."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=9)

    headers = _HEADERS_UPPER if uppercase_headers else _HEADERS
    for header, w in zip(headers, _COL_WIDTHS):
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
async def test_pdf_import_uppercase_headers(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """PDFs with all-uppercase headers (new TR format) are imported correctly."""
    acc = await create_account(test_app)

    rows = [("29.01.2026", "Einlage", "Uppercase header test", "100,00", "", "100,00")]
    pdf_path = tmp_path / "uppercase.pdf"
    _make_tr_pdf(rows, pdf_path, uppercase_headers=True)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=acc["id"], pdf_path=pdf_path
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


# ---------------------------------------------------------------------------
# New-format (borderless / word-position) tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pdf_import_new_format_parses_incoming_and_outgoing(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """Borderless TR PDFs (new format, merged ZAHLUNGSEINGANGZAHLUNGSAUSGANG header)
    are parsed correctly for both incoming and outgoing transactions."""
    acc = await create_account(test_app)

    rows = [
        ("8 Jan. 2026", "Einlage", "Einzahlung Bank", "100,00", ""),
        ("10 Jan. 2026", "Kartentransaktion", "Amazon", "", "50,00"),
    ]
    pdf_path = tmp_path / "new_format.pdf"
    _make_tr_pdf_new_format(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=acc["id"], pdf_path=pdf_path
        )

    assert result.total_rows == 2, result
    assert result.created == 2, result
    assert result.failed == 0, result
    assert result.errors == [], result

    resp = await test_app.get("/api/transactions", params={"account_id": acc["id"]})
    items = resp.json()["items"]
    by_payee = {item["payee"]: item for item in items}

    assert Decimal(by_payee["Einlage"]["amount"]) == Decimal("100.00")
    assert by_payee["Einlage"]["booking_date"] == "2026-01-08"
    assert Decimal(by_payee["Kartentransaktion"]["amount"]) == Decimal("-50.00")
    assert by_payee["Kartentransaktion"]["booking_date"] == "2026-01-10"


@pytest.mark.asyncio
async def test_pdf_import_new_format_noise_row_silently_skipped(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """Non-transaction rows whose date cell starts with >2 digits (ZIP codes, etc.)
    are silently skipped — not counted as failed rows."""
    acc = await create_account(test_app)

    rows = [("15 Jan. 2026", "Einlage", "Gutschrift", "200,00", "")]
    pdf_path = tmp_path / "noise.pdf"
    _make_tr_pdf_new_format(
        rows,
        pdf_path,
        noise_date_cell="60311 Frankfurt",  # 5-digit ZIP — must NOT become a failed row
    )

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=acc["id"], pdf_path=pdf_path
        )

    assert result.total_rows == 1, result
    assert result.created == 1, result
    assert result.failed == 0, result
    assert result.errors == [], result


@pytest.mark.asyncio
async def test_pdf_import_new_format_false_datum_ignored(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """The false DATUM label (date range header at x≈389pt) on page 1 is not
    mistaken for the table header — only the real header triggers parsing."""
    acc = await create_account(test_app)

    rows = [("3 Feb. 2026", "Einlage", "Test", "75,00", "")]
    pdf_path = tmp_path / "false_datum.pdf"
    _make_tr_pdf_new_format(rows, pdf_path, include_false_datum=True)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=acc["id"], pdf_path=pdf_path
        )

    assert result.total_rows == 1, result
    assert result.created == 1, result
    assert result.failed == 0, result


@pytest.mark.asyncio
async def test_pdf_import_new_format_full_german_month_names(
    test_app: AsyncClient,
    tmp_path: Path,
) -> None:
    """New TR PDFs use full German month names without trailing period
    (März, Juni, Oktober …) rather than 3-letter abbreviations."""
    acc = await create_account(test_app)

    rows = [
        ("1 März 2026", "Einlage", "Maerz-Einzahlung", "50,00", ""),
        ("15 Juni 2026", "Kartentransaktion", "Juni-Kauf", "", "30,00"),
        ("3 Oktober 2026", "Einlage", "Okt-Einzahlung", "20,00", ""),
    ]
    pdf_path = tmp_path / "full_months.pdf"
    _make_tr_pdf_new_format(rows, pdf_path)

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[attr-defined]
    async with session_factory() as session:
        result = await import_transactions_from_pdf_path(
            session=session, account_id=acc["id"], pdf_path=pdf_path
        )

    assert result.total_rows == 3, result
    assert result.created == 3, result
    assert result.failed == 0, result

    resp = await test_app.get("/api/transactions", params={"account_id": acc["id"]})
    items = resp.json()["items"]
    dates = {item["booking_date"] for item in items}
    assert dates == {"2026-03-01", "2026-06-15", "2026-10-03"}
