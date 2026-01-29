import csv
import hashlib
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.services.transaction_hash import compute_import_hash, HashInput

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


def _parse_date(value: str) -> date:
    return date.fromisoformat(value.strip())


def _parse_decimal(value: str) -> Decimal:
    return Decimal(value.strip())


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


async def import_transactions_from_csv_path(
    *,
    session: AsyncSession,
    account_id: int,
    csv_path: Path,
    max_errors: int = 50,
) -> ImportResult:
    res = await session.execute(select(Account).where(Account.id == account_id))  # type: ignore[arg-type]
    if res.scalar_one_or_none() is None:
        raise ValueError(f"Account {account_id} not found")

    total_rows = 0
    created = 0
    duplicates = 0
    failed = 0
    errors: list[str] = []

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=",")
        if reader.fieldnames is None:
            raise ValueError("CSV has no header row")

        for idx, row in enumerate(reader, start=2):
            total_rows += 1

            try:
                booking_date = _parse_date(row["booking_date"])
                amount = _parse_decimal(row["amount"])
                currency = _normalize_currency(row["currency"])

                payee = (row.get("payee") or "").strip() or None
                purpose = (row.get("purpose") or "").strip() or None

                external_id = (row.get("external_id") or "").strip() or None
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

                session.add(db_obj)
                try:
                    await session.commit()
                except IntegrityError:
                    await session.rollback()
                    duplicates += 1
                    continue

                created += 1

            except KeyError as e:
                failed += 1
                if len(errors) < max_errors:
                    errors.append(f"Line {idx}: missing column {e}")
            except (ValueError, InvalidOperation) as e:
                failed += 1
                if len(errors) < max_errors:
                    errors.append(f"Line {idx}: {e!s}")

    return ImportResult(
        total_rows=total_rows,
        created=created,
        duplicates=duplicates,
        failed=failed,
        errors=errors,
    )
