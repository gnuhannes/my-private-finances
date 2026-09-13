"""Cash accounts are excluded from transfer auto-detection (090 design:
manual linking only) — direct service-level tests, registers in pytest-cov.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.services.transfer_detection import detect_transfer_candidates


def _id(obj: Account | Transaction) -> int:
    """Non-optional accessor for a just-inserted-and-refreshed row's PK."""
    assert obj.id is not None
    return obj.id


async def _make_account(
    session: AsyncSession, name: str, account_type: str = "bank"
) -> Account:
    acc = Account(name=name, currency="EUR", account_type=account_type)
    session.add(acc)
    await session.commit()
    await session.refresh(acc)
    return acc


async def _make_tx(
    session: AsyncSession, *, account_id: int, amount: Decimal, import_hash: str
) -> Transaction:
    tx = Transaction(
        account_id=account_id,
        booking_date=date(2026, 5, 1),
        amount=amount,
        currency="EUR",
        import_source="manual",
        import_hash=import_hash,
    )
    session.add(tx)
    await session.commit()
    await session.refresh(tx)
    return tx


@pytest.mark.asyncio
async def test_detect_proposes_pair_between_two_bank_accounts(
    db_session: AsyncSession,
) -> None:
    bank_a = await _make_account(db_session, "Checking")
    bank_b = await _make_account(db_session, "Savings")
    await _make_tx(
        db_session, account_id=_id(bank_a), amount=Decimal("-100.00"), import_hash="h1"
    )
    await _make_tx(
        db_session, account_id=_id(bank_b), amount=Decimal("100.00"), import_hash="h2"
    )

    candidates = await detect_transfer_candidates(db_session)

    assert len(candidates) == 1


@pytest.mark.asyncio
async def test_detect_skips_pair_involving_a_cash_account(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Checking")
    cash = await _make_account(db_session, "Wallet", account_type="cash")
    await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    await _make_tx(
        db_session, account_id=_id(cash), amount=Decimal("50.00"), import_hash="h2"
    )

    candidates = await detect_transfer_candidates(db_session)

    assert candidates == []
