import hashlib
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class HashInput:
    account_id: int
    booking_date: date
    amount: Decimal
    currency: str
    payee: Optional[str]
    purpose: Optional[str]
    external_id: Optional[str]
    import_source: Optional[str]


def compute_import_hash(data: HashInput) -> str:
    parts = [
        str(data.account_id),
        data.booking_date.isoformat(),
        f"{data.amount:.2f}",
        data.currency.upper(),
        (data.payee or "").strip(),
        (data.purpose or "").strip(),
        (data.external_id or "").strip(),
        (data.import_source or "").strip(),
    ]
    raw = "\n".join(parts).encode("utf-8")

    return hashlib.sha256(raw).hexdigest()
