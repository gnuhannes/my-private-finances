from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pdfplumber
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.services.categorization import (
    load_rules_ordered,
    match_transaction,
)
from my_private_finances.services.csv_import import ImportResult
from my_private_finances.services.transaction_hash import HashInput, compute_import_hash

logger = logging.getLogger(__name__)

IMPORT_SOURCE = "pdf"
CURRENCY = "EUR"

# Expected column headers in Trade Republic Kontoauszug PDFs
_COL_DATE = "Datum"
_COL_TYPE = "Typ"
_COL_DESC = "Beschreibung"
_COL_IN = "Zahlungseingang"
_COL_OUT = "Zahlungsausgang"


def _parse_date(value: str) -> datetime:
    return datetime.strptime(value.strip(), "%d.%m.%Y").date()  # type: ignore[return-value]


def _parse_german_decimal(value: str) -> Decimal:
    """Parse German-formatted number: '1.234,56' → Decimal('1234.56')."""
    raw = value.strip().replace(".", "").replace(",", ".")
    return Decimal(raw)


def _extract_rows(pdf_path: Path) -> list[list[str | None]]:
    """Return all data rows from all pages, stripping header rows."""
    all_rows: list[list[str | None]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if row is None:
                    continue
                # Normalise cells to str (pdfplumber returns None for empty cells)
                cells = [c if c is not None else "" for c in row]
                # Skip header rows (contain "Datum" in the first cell position)
                if _COL_DATE in cells:
                    continue
                all_rows.append(cells)  # type: ignore[arg-type]
    return all_rows


def _find_column_indices(pdf_path: Path) -> dict[str, int]:
    """Locate header row and return a mapping of column name → index."""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if row is None:
                    continue
                cells = [c or "" for c in row]
                if _COL_DATE in cells:
                    return {
                        _COL_DATE: cells.index(_COL_DATE),
                        _COL_TYPE: cells.index(_COL_TYPE) if _COL_TYPE in cells else -1,
                        _COL_DESC: cells.index(_COL_DESC) if _COL_DESC in cells else -1,
                        _COL_IN: cells.index(_COL_IN) if _COL_IN in cells else -1,
                        _COL_OUT: cells.index(_COL_OUT) if _COL_OUT in cells else -1,
                    }
    raise ValueError(
        "No Trade Republic table header found in PDF (expected 'Datum' column)"
    )


async def import_transactions_from_pdf_path(
    *,
    session: AsyncSession,
    account_id: int,
    pdf_path: Path,
    max_errors: int = 50,
) -> ImportResult:
    res = await session.execute(select(Account).where(Account.id == account_id))  # type: ignore[arg-type]
    if res.scalar_one_or_none() is None:
        raise ValueError(f"Account {account_id} not found")

    rules = await load_rules_ordered(session)
    logger.info(
        "PDF import started: account_id=%d, file=%s, rules=%d",
        account_id,
        pdf_path.name,
        len(rules),
    )

    try:
        col = _find_column_indices(pdf_path)
    except ValueError as e:
        raise ValueError(str(e)) from e

    rows = _extract_rows(pdf_path)

    total_rows = 0
    created = 0
    duplicates = 0
    failed = 0
    errors: list[str] = []

    # Phase 1: parse all rows into Transaction objects; count parse errors
    pending: list[Transaction] = []
    seen_hashes: set[str] = set()

    for idx, row in enumerate(rows, start=1):
        # Skip completely empty rows (page breaks, footers, etc.)
        if all(c == "" for c in row):
            continue

        total_rows += 1

        try:
            date_raw = row[col[_COL_DATE]] if col[_COL_DATE] >= 0 else ""
            if not date_raw or not date_raw.strip():
                raise ValueError("Empty Datum")

            booking_date = _parse_date(date_raw)

            typ_raw = (row[col[_COL_TYPE]] or "").strip() if col[_COL_TYPE] >= 0 else ""
            payee = typ_raw or None

            desc_raw = (
                (row[col[_COL_DESC]] or "").strip() if col[_COL_DESC] >= 0 else ""
            )
            purpose = desc_raw or None

            in_raw = (row[col[_COL_IN]] or "").strip() if col[_COL_IN] >= 0 else ""
            out_raw = (row[col[_COL_OUT]] or "").strip() if col[_COL_OUT] >= 0 else ""

            if in_raw:
                amount = _parse_german_decimal(in_raw)
            elif out_raw:
                amount = -_parse_german_decimal(out_raw)
            else:
                raise ValueError("Neither Zahlungseingang nor Zahlungsausgang is set")

            import_hash = compute_import_hash(
                HashInput(
                    account_id=account_id,
                    booking_date=booking_date,
                    amount=amount,
                    currency=CURRENCY,
                    payee=payee,
                    purpose=purpose,
                    external_id=None,
                    import_source=IMPORT_SOURCE,
                )
            )

            if import_hash in seen_hashes:
                duplicates += 1
                logger.debug("Row %d: within-file duplicate, skipped", idx)
                continue
            seen_hashes.add(import_hash)

            db_obj = Transaction(
                account_id=account_id,
                booking_date=booking_date,
                amount=amount,
                currency=CURRENCY,
                payee=payee,
                purpose=purpose,
                category_id=None,
                external_id=None,
                import_source=IMPORT_SOURCE,
                import_hash=import_hash,
            )

            if rules:
                matched_cat = match_transaction(db_obj, rules)
                if matched_cat is not None:
                    db_obj.category_id = matched_cat

            pending.append(db_obj)

        except (ValueError, InvalidOperation, IndexError) as e:
            failed += 1
            msg = f"Row {idx}: {e!s}"
            logger.warning(msg)
            if len(errors) < max_errors:
                errors.append(msg)

    # Phase 2: filter out rows already in DB, then batch-insert the rest
    if pending:
        pending_hashes = {tx.import_hash for tx in pending}
        existing_result = await session.execute(
            select(Transaction.import_hash).where(  # type: ignore[call-overload]
                Transaction.account_id == account_id,  # type: ignore[arg-type]
                Transaction.import_hash.in_(pending_hashes),  # type: ignore[attr-defined]
            )
        )
        existing_hashes = {row[0] for row in existing_result}
        duplicates += len(existing_hashes)

        new_transactions = [
            tx for tx in pending if tx.import_hash not in existing_hashes
        ]
        if new_transactions:
            session.add_all(new_transactions)
            await session.commit()
        created = len(new_transactions)

    logger.info(
        "PDF import complete: account_id=%d, total=%d, created=%d, duplicates=%d, failed=%d",
        account_id,
        total_rows,
        created,
        duplicates,
        failed,
    )

    return ImportResult(
        total_rows=total_rows,
        created=created,
        duplicates=duplicates,
        failed=failed,
        errors=errors,
    )
