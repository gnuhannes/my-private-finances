from __future__ import annotations

import logging
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pdfplumber
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.schemas.import_result import ImportErrorDetail
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
_COL_SALDO = "Saldo"

# All columns we recognize (including Saldo, which we use only as a right boundary)
_ALL_COLS = (_COL_DATE, _COL_TYPE, _COL_DESC, _COL_IN, _COL_OUT, _COL_SALDO)
# Columns we actually import data from
_IMPORT_COLS = (_COL_DATE, _COL_TYPE, _COL_DESC, _COL_IN, _COL_OUT)
# Header token produced when IN and OUT columns are too close to separate
_COL_IN_OUT_MERGED = (_COL_IN + _COL_OUT).upper()

# Y tolerance for grouping sub-rows into one transaction row.
# Overridden at runtime by _compute_y_tolerance(); this is the fallback.
# Needs to be > max within-transaction gap (~13pt for some types) but
# < min between-transaction gap (~24pt).
_Y_TOLERANCE_DEFAULT = 18
_X_TOLERANCE = 5  # margin when assigning a word to its column

# German abbreviated month names → month number
_DE_MONTHS: dict[str, int] = {
    # 3-letter abbreviations (old TR format, with or without trailing period)
    "jan": 1,
    "feb": 2,
    "mär": 3,
    "mar": 3,
    "apr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "okt": 10,
    "nov": 11,
    "dez": 12,
    # Full German month names (new TR format — no trailing period)
    "januar": 1,
    "februar": 2,
    "märz": 3,
    "april": 4,
    "juni": 6,
    "juli": 7,
    "august": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "dezember": 12,
}


def _parse_date(value: str) -> datetime:
    raw = value.strip()
    # Classic format: 29.01.2026
    try:
        return datetime.strptime(raw, "%d.%m.%Y").date()  # type: ignore[return-value]
    except ValueError:
        pass
    # New TR format: "8 Jan. 2026" or "01 März 2026" (day, German month, year).
    # Day may have a trailing period ("1." in some locales); month may be a
    # 3-letter abbreviation with period ("Jan.") or a full name ("März", "Juni").
    parts = raw.split()
    if len(parts) == 3:
        day_s, mon_s, year_s = parts
        month_num = _DE_MONTHS.get(mon_s.rstrip(".").lower())
        if month_num:
            try:
                from datetime import date as _date

                return _date(int(year_s), month_num, int(day_s.rstrip(".")))  # type: ignore[return-value]
            except (ValueError, TypeError):
                pass
    raise ValueError(f"Invalid date: '{raw}'")


def _strip_saldo(raw: str) -> str:
    """In TR PDFs the SALDO amount leaks into the amount cell as 'amount € saldo'.
    The € sign is the separator — take only the part before it."""
    return raw.split("€")[0].strip()


def _parse_german_decimal(value: str) -> Decimal:
    """Parse German-formatted number: '1.234,56' → Decimal('1234.56').
    Strips non-numeric suffixes/prefixes (€, +, narrow spaces) before parsing.
    """
    # Keep only digits, comma, period, and a leading minus sign
    cleaned = re.sub(r"[^\d,.\-]", "", value.strip())
    if not cleaned or cleaned == "-":
        raise ValueError(f"Invalid decimal value: '{value.strip()}'")
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        raise ValueError(f"Invalid decimal value: '{value.strip()}'")


def _compute_y_tolerance(words: list[dict]) -> float:
    """Return 1.5× the average word height, clamped to [14, 20]pt.

    Lower bound is 18pt — matching the design-safe default — because the
    dynamic formula (1.5× avg word height) yields ~12pt for typical 8pt TR
    text, which is less than the actual top-to-top span across all three
    sub-rows (~15–17pt observed on real PDFs).  Going below 18pt causes the
    year sub-row to be separated from day+month, producing "01 März" failures.
    Upper bound is 20pt to stay safely below the ~24pt between-transaction gap.
    """
    heights = [
        w["bottom"] - w["top"] for w in words if w.get("bottom") and w.get("top")
    ]
    if not heights:
        return _Y_TOLERANCE_DEFAULT
    avg = sum(heights) / len(heights)
    return max(18.0, min(20.0, avg * 1.5))


def _group_words_by_row(
    words: list[dict], y_tolerance: float = _Y_TOLERANCE_DEFAULT
) -> list[list[dict]]:
    """Group pdfplumber word dicts into rows by vertical proximity.
    Preserves (top, x0) sort order within each merged row so that words at
    identical x positions (e.g. day and year both at x=74.4) stay in reading
    order (top-to-bottom) rather than being interleaved arbitrarily.
    """
    if not words:
        return []
    sorted_words = sorted(words, key=lambda w: (w["top"], w["x0"]))
    rows: list[list[dict]] = []
    current: list[dict] = [sorted_words[0]]
    ref_y: float = sorted_words[0]["top"]
    for word in sorted_words[1:]:
        if abs(word["top"] - ref_y) <= y_tolerance:
            current.append(word)
        else:
            rows.append(current)  # preserve (top, x0) order — do NOT re-sort by x0
            current = [word]
            ref_y = word["top"]
    rows.append(current)
    return rows


def _find_col_x_positions(rows: list[list[dict]]) -> dict[str, float] | None:
    """
    Scan word rows for the header row.
    Returns {column_name: x0_position} or None if no header found.
    Handles:
    - False DATUM labels (requires at least one other column present)
    - Merged ZAHLUNGSEINGANGZAHLUNGSAUSGANG word: splits at the word's own
      midpoint ((x0+x1)/2) per the jcmpagel reference parser
    - SALDO boundary shifted -5pt to catch right-aligned saldo amounts
    """
    for row in rows:
        upper_to_word = {w["text"].upper(): w for w in row}
        upper_to_x = {k: w["x0"] for k, w in upper_to_word.items()}
        if _COL_DATE.upper() not in upper_to_x:
            continue
        # Require at least one other recognised column (or merged IN+OUT token)
        other_known = [c.upper() for c in _IMPORT_COLS if c != _COL_DATE]
        if not any(k in upper_to_x for k in other_known + [_COL_IN_OUT_MERGED]):
            continue
        # Split merged ZAHLUNGSEINGANGZAHLUNGSAUSGANG into two virtual columns
        if _COL_IN_OUT_MERGED in upper_to_word and _COL_IN.upper() not in upper_to_x:
            merged_word = upper_to_word[_COL_IN_OUT_MERGED]
            midpoint = (merged_word["x0"] + merged_word["x1"]) / 2
            upper_to_x[_COL_IN.upper()] = merged_word["x0"]
            upper_to_x[_COL_OUT.upper()] = midpoint
        # Shift SALDO boundary 5pt left so right-aligned saldo amounts are caught
        if _COL_SALDO.upper() in upper_to_x:
            upper_to_x[_COL_SALDO.upper()] -= 5
        return {
            col: upper_to_x[col.upper()]
            for col in _ALL_COLS
            if col.upper() in upper_to_x
        }
    return None


def _assign_words_to_columns(
    word_row: list[dict],
    col_starts: list[float],
) -> list[str]:
    """Assign each word in a row to a column by x-position, return cell strings."""
    cells: list[list[str]] = [[] for _ in col_starts]
    for word in word_row:
        col_idx = 0
        for i, start in enumerate(col_starts):
            if start <= word["x0"] + _X_TOLERANCE:
                col_idx = i
        cells[col_idx].append(word["text"])
    return [" ".join(parts) for parts in cells]


def _parse_via_table(pdf_path: Path) -> tuple[dict[str, int], list[list[str]]] | None:
    """
    Try table-line-based extraction (works for PDFs with visible borders).
    Returns (col_indices, data_rows) or None if no table structure is found.
    """
    col_indices: dict[str, int] = {}
    data_rows: list[list[str]] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if row is None:
                    continue
                cells = [c or "" for c in row]
                cells_upper = [c.upper() for c in cells]
                if _COL_DATE.upper() in cells_upper:
                    # This is the header row — build col_indices
                    def _idx(name: str) -> int:
                        u = name.upper()
                        return cells_upper.index(u) if u in cells_upper else -1

                    col_indices = {
                        col: _idx(col) for col in _IMPORT_COLS if _idx(col) >= 0
                    }
                else:
                    data_rows.append(cells)

    return (col_indices, data_rows) if col_indices else None


def _parse_via_words(pdf_path: Path) -> tuple[dict[str, int], list[list[str]]]:
    """
    Word-position-based extraction for PDFs without visible table borders.
    Returns (col_indices, data_rows) or raises ValueError if header not found.
    """
    col_x: dict[str, float] = {}
    data_rows: list[list[str]] = []
    header_found = False

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            if not words:
                continue

            y_tol = _compute_y_tolerance(words)
            word_rows = _group_words_by_row(words, y_tolerance=y_tol)

            if not header_found:
                positions = _find_col_x_positions(word_rows)
                if positions is None:
                    continue
                col_x = positions
                header_found = True
                header_row_idx = next(
                    i
                    for i, r in enumerate(word_rows)
                    if _COL_DATE.upper() in {w["text"].upper() for w in r}
                )
                word_rows = word_rows[header_row_idx + 1 :]
            else:
                # On pages after the first, the table header is repeated —
                # drop any row that looks like a column-header row.
                other_known = {c.upper() for c in _IMPORT_COLS if c != _COL_DATE}
                word_rows = [
                    r
                    for r in word_rows
                    if not (
                        _COL_DATE.upper() in {w["text"].upper() for w in r}
                        and other_known & {w["text"].upper() for w in r}
                    )
                ]

            sorted_cols = sorted(col_x.items(), key=lambda kv: kv[1])
            col_starts = [x for _, x in sorted_cols]

            date_col_idx = next(
                (i for i, (name, _) in enumerate(sorted_cols) if name == _COL_DATE),
                0,
            )

            for word_row in word_rows:
                if not word_row:
                    continue
                cells = _assign_words_to_columns(word_row, col_starts)
                # Pre-filter structural noise. Real transaction dates always
                # look like "8 Jan. 2026" or "08.01.2026" — they start with
                # one or two digits followed by a space or dot. Rows whose
                # Datum cell starts otherwise (BIC codes, city names, ZIP
                # codes like "60311", author names, etc.) are skipped silently.
                date_cell = cells[date_col_idx] if date_col_idx < len(cells) else ""
                stripped = date_cell.strip()
                if not re.match(r"^\d{1,2}[\s.]", stripped):
                    continue
                data_rows.append(cells)

    if not header_found:
        raise ValueError(
            "No Trade Republic table header found in PDF (expected 'Datum' column)"
        )

    sorted_all = sorted(col_x.items(), key=lambda kv: kv[1])
    col_indices = {
        name: i for i, (name, _) in enumerate(sorted_all) if name in _IMPORT_COLS
    }
    return col_indices, data_rows


def _parse_pdf(pdf_path: Path) -> tuple[dict[str, int], list[list[str]]]:
    """
    Parse a Trade Republic PDF.
    Tries table-line extraction first; falls back to word-position extraction
    for PDFs without visible borders (newer TR format).
    """
    result = _parse_via_table(pdf_path)
    if result is not None:
        logger.debug("PDF parsed via table extraction")
        return result
    logger.debug("No table structure found, falling back to word-position extraction")
    return _parse_via_words(pdf_path)


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
        col, rows = _parse_pdf(pdf_path)
    except ValueError as e:
        raise ValueError(str(e)) from e

    total_rows = 0
    created = 0
    duplicates = 0
    failed = 0
    all_errors: list[ImportErrorDetail] = []

    # Phase 1: parse all rows into Transaction objects; count parse errors
    pending: list[Transaction] = []
    seen_hashes: set[str] = set()

    def _record_error(err: ImportErrorDetail) -> None:
        if len(all_errors) < max_errors:
            all_errors.append(err)
        logger.warning(
            "Row %s: [%s] %s",
            err.row,
            err.field or "?",
            err.message,
        )

    for idx, row in enumerate(rows, start=1):
        # Skip completely empty rows (page breaks, footers, etc.)
        if all(c == "" for c in row):
            continue

        total_rows += 1

        # --- Datum ---
        try:
            date_raw = row[col[_COL_DATE]] if col.get(_COL_DATE, -1) >= 0 else ""
        except IndexError as e:
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    field=_COL_DATE,
                    message=f"Column index out of range: {e}",
                    unexpected=True,
                )
            )
            failed += 1
            continue

        if not date_raw or not date_raw.strip():
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    field=_COL_DATE,
                    message="Empty date (Datum)",
                )
            )
            failed += 1
            continue

        try:
            booking_date = _parse_date(date_raw)
        except ValueError as e:
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    field=_COL_DATE,
                    raw_value=date_raw,
                    message=str(e),
                    hint="Expected format: dd.mm.yyyy (e.g. 15.03.2024)",
                )
            )
            failed += 1
            continue

        # --- Optional text fields ---
        typ_idx = col.get(_COL_TYPE, -1)
        typ_raw = (
            (row[typ_idx] or "").strip() if typ_idx >= 0 and typ_idx < len(row) else ""
        )
        payee = typ_raw or None

        desc_idx = col.get(_COL_DESC, -1)
        desc_raw = (
            (row[desc_idx] or "").strip()
            if desc_idx >= 0 and desc_idx < len(row)
            else ""
        )
        purpose = desc_raw or None

        # --- Amount (Zahlungseingang / Zahlungsausgang) ---
        try:
            in_idx = col.get(_COL_IN, -1)
            out_idx = col.get(_COL_OUT, -1)
            in_raw = (
                (row[in_idx] or "").strip() if in_idx >= 0 and in_idx < len(row) else ""
            )
            out_raw = (
                (row[out_idx] or "").strip()
                if out_idx >= 0 and out_idx < len(row)
                else ""
            )
        except IndexError as e:
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    message=f"Amount column index out of range: {e}",
                    unexpected=True,
                )
            )
            failed += 1
            continue

        if in_raw:
            in_amount = _strip_saldo(in_raw)
            try:
                amount = _parse_german_decimal(in_amount)
            except ValueError as e:
                _record_error(
                    ImportErrorDetail(
                        row=idx,
                        field=_COL_IN,
                        raw_value=in_raw,
                        message=str(e),
                        hint="Expected German decimal format, e.g. '1.234,56'",
                    )
                )
                failed += 1
                continue
        elif out_raw:
            out_amount = _strip_saldo(out_raw)
            try:
                amount = -_parse_german_decimal(out_amount)
            except ValueError as e:
                _record_error(
                    ImportErrorDetail(
                        row=idx,
                        field=_COL_OUT,
                        raw_value=out_raw,
                        message=str(e),
                        hint="Expected German decimal format, e.g. '1.234,56'",
                    )
                )
                failed += 1
                continue
        else:
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    message="Neither Zahlungseingang nor Zahlungsausgang is set",
                    hint="This row has no amount in either the income or expense column.",
                )
            )
            failed += 1
            continue

        try:
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
        except Exception as e:
            _record_error(
                ImportErrorDetail(
                    row=idx,
                    message=f"Failed to compute import hash: {e}",
                    unexpected=True,
                )
            )
            failed += 1
            continue

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

    errors_truncated = failed > len(all_errors)
    return ImportResult(
        total_rows=total_rows,
        created=created,
        duplicates=duplicates,
        failed=failed,
        errors=all_errors,
        errors_truncated=errors_truncated,
    )
