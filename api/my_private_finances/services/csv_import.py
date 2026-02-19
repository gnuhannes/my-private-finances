import csv
import hashlib
import logging
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.services.categorization import (
    load_rules_ordered,
    match_transaction,
)
from my_private_finances.services.transaction_hash import compute_import_hash, HashInput

logger = logging.getLogger(__name__)

IMPORT_SOURCE = "csv"


@dataclass(slots=True)
class ImportResult:
    total_rows: int
    created: int
    duplicates: int
    failed: int
    errors: list[str]


def _normalize_currency(value: str) -> str:
    return value.strip().upper()


def _parse_date(value: str, date_format: str) -> date:
    raw = value.strip()
    if date_format == "iso":
        return date.fromisoformat(raw)
    if date_format == "dmy":
        for fmt in ("%d.%m.%Y", "%d.%m.%y"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Invalid DMY date: {raw}")
    raise ValueError(f"Unsupported date format: {date_format}")


def _parse_decimal(value: str, *, decimal_comma: bool) -> Decimal:
    raw = value.strip()
    if decimal_comma:
        raw = raw.replace(".", "").replace(",", ".")
    return Decimal(raw)


def _row_fingerprint(row: dict[str, Any]) -> str:
    """
    Deterministic fallback external_id if none is provided.
    Must be stable across re-imports of the same CSV content.
    """
    parts = [
        str(row.get("booking_date", "")).strip(),
        str(row.get("amount", "")).strip(),
        str(row.get("currency", "")).strip().upper(),
        str(row.get("payee", "") or "").strip(),
        str(row.get("purpose", "") or "").strip(),
    ]
    raw = "\n".join(parts).encode("utf-8")
    return hashlib.sha1(raw).hexdigest()


def _first_present(row: dict[str, Any], keys: list[str]) -> str | None:
    for k in keys:
        if k in row:
            val = (row.get(k) or "").strip()
            return val or None
    return None


async def import_transactions_from_csv_path(
    *,
    session: AsyncSession,
    account_id: int,
    csv_path: Path,
    max_errors: int = 50,
    delimiter: str = ",",
    date_format: str = "iso",
    decimal_comma: bool = False,
) -> ImportResult:
    res = await session.execute(select(Account).where(Account.id == account_id))  # type: ignore[arg-type]
    if res.scalar_one_or_none() is None:
        raise ValueError(f"Account {account_id} not found")

    rules = await load_rules_ordered(session)
    logger.info(
        "CSV import started: account_id=%d, file=%s, rules=%d",
        account_id,
        csv_path.name,
        len(rules),
    )

    total_rows = 0
    created = 0
    duplicates = 0
    failed = 0
    errors: list[str] = []

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        if reader.fieldnames is None:
            raise ValueError("CSV has no header row")

        for idx, row in enumerate(reader, start=2):
            total_rows += 1

            try:
                booking_date_raw = _first_present(
                    row, ["booking_date", "Buchungstag", "Valutadatum"]
                )
                amount_raw = _first_present(row, ["amount", "Betrag"])
                currency_raw = _first_present(row, ["currency", "Waehrung"])

                if booking_date_raw is None:
                    raise KeyError("booking_date/Buchungstag/Valutadatum")
                if amount_raw is None:
                    raise KeyError("amount/Betrag")
                if currency_raw is None:
                    raise KeyError("currency/Waehrung")

                booking_date = _parse_date(booking_date_raw, date_format=date_format)
                amount = _parse_decimal(amount_raw, decimal_comma=decimal_comma)
                currency = _normalize_currency(currency_raw)

                payee = _first_present(
                    row, ["payee", "Beguenstigter/Zahlungspflichtiger"]
                )
                purpose = _first_present(row, ["purpose", "Verwendungszweck"])

                external_id = _first_present(
                    row,
                    [
                        "external_id",
                        "Kundenreferenz (End-to-End)",
                        "Sammlerreferenz",
                        "Mandatsreferenz",
                    ],
                )
                if external_id is None:
                    external_id = _row_fingerprint(row)

                import_hash = compute_import_hash(
                    HashInput(
                        account_id=account_id,
                        booking_date=booking_date,
                        amount=amount,
                        currency=currency,
                        payee=payee,
                        purpose=purpose,
                        external_id=external_id,
                        import_source=IMPORT_SOURCE,
                    )
                )

                db_obj = Transaction(
                    account_id=account_id,
                    booking_date=booking_date,
                    amount=amount,
                    currency=currency,
                    payee=payee,
                    purpose=purpose,
                    category_id=None,
                    external_id=external_id,
                    import_source=IMPORT_SOURCE,
                    import_hash=import_hash,
                )

                if rules:
                    matched_cat = match_transaction(db_obj, rules)
                    if matched_cat is not None:
                        db_obj.category_id = matched_cat

                session.add(db_obj)
                try:
                    await session.commit()
                except IntegrityError:
                    await session.rollback()
                    duplicates += 1
                    logger.debug("Row %d: duplicate, skipped", idx)
                    continue

                created += 1

            except KeyError as e:
                failed += 1
                msg = f"Line {idx}: missing column {e}"
                logger.warning(msg)
                if len(errors) < max_errors:
                    errors.append(msg)
            except (ValueError, InvalidOperation) as e:
                failed += 1
                msg = f"Line {idx}: {e!s}"
                logger.warning(msg)
                if len(errors) < max_errors:
                    errors.append(msg)

    logger.info(
        "CSV import complete: account_id=%d, total=%d, created=%d, duplicates=%d, failed=%d",
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
