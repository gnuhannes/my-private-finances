from __future__ import annotations

from dataclasses import replace
from datetime import date
from decimal import Decimal

import pytest

from my_private_finances.services.transaction_hash import HashInput, compute_import_hash


def test_compute_import_hash_is_deterministic() -> None:
    inp = HashInput(
        account_id=1,
        booking_date=date.fromisoformat("2026-01-18"),
        amount=Decimal("12.34"),
        currency="EUR",
        payee="Rewe",
        purpose="Groceries",
        import_source="manual",
        external_id="abc-1",
    )

    h1 = compute_import_hash(inp)
    h2 = compute_import_hash(inp)

    assert h1 == h2
    assert isinstance(h1, str)
    assert len(h1) == 64  # sha256 hex


def test_compute_import_hash_changes_when_any_field_changes() -> None:
    base = HashInput(
        account_id=1,
        booking_date=date.fromisoformat("2026-01-18"),
        amount=Decimal("12.34"),
        currency="EUR",
        payee="Rewe",
        purpose="Groceries",
        import_source="manual",
        external_id="abc-1",
    )

    h_base = compute_import_hash(base)

    changed = replace(base, amount=Decimal("12.35"))
    assert compute_import_hash(changed) != h_base


@pytest.mark.parametrize(
    "payee,purpose,import_source,external_id",
    [
        ("Rewe", None, None, None),
        (None, "Groceries", None, None),
        (None, None, "manual", None),
        (None, None, None, "abc-1"),
        (None, None, None, None),
        ("Rewe", "Groceries", None, None),
    ],
)
def test_compute_import_hash_handles_optional_fields(
    payee: str | None,
    purpose: str | None,
    import_source: str | None,
    external_id: str | None,
) -> None:
    inp = HashInput(
        account_id=1,
        booking_date=date.fromisoformat("2026-01-18"),
        amount=Decimal("12.34"),
        currency="EUR",
        payee=payee,
        purpose=purpose,
        import_source=import_source,
        external_id=external_id,
    )

    h = compute_import_hash(inp)
    assert isinstance(h, str)
    assert len(h) == 64


def test_import_hash_amount_format_is_stable_two_decimals() -> None:
    h1 = compute_import_hash(
        HashInput(
            account_id=1,
            booking_date=date(2026, 1, 18),
            amount=Decimal("12.3"),
            currency="eur",
            payee="Rewe",
            purpose="Groceries",
            external_id="abc",
            import_source="manual",
        )
    )

    h2 = compute_import_hash(
        HashInput(
            account_id=1,
            booking_date=date(2026, 1, 18),
            amount=Decimal("12.30"),
            currency="EUR",
            payee="Rewe",
            purpose="Groceries",
            external_id="abc",
            import_source="manual",
        )
    )

    assert h1 == h2
