"""A transaction can be the subject of at most one active (pending/confirmed)
TransferCandidate — the partial unique indexes on transfer_candidate plus the
application-level guards that keep those indexes from ever being violated.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.models.transfer_candidate import TransferCandidate
from my_private_finances.services.exceptions import ConflictError
from my_private_finances.services.transfer_detection import (
    confirm_transfer,
    create_manual_transfer,
    detect_transfer_candidates,
)
from my_private_finances.utils.sql import table


def _id(obj: Account | Transaction) -> int:
    assert obj.id is not None
    return obj.id


async def _make_account(session: AsyncSession, name: str) -> Account:
    acc = Account(name=name, currency="EUR")
    session.add(acc)
    await session.commit()
    await session.refresh(acc)
    return acc


async def _make_tx(
    session: AsyncSession,
    *,
    account_id: int,
    amount: Decimal,
    import_hash: str,
    booking_date: date = date(2026, 5, 1),
) -> Transaction:
    tx = Transaction(
        account_id=account_id,
        booking_date=booking_date,
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
async def test_partial_index_rejects_two_active_rows_for_same_from_tx(
    db_session: AsyncSession,
) -> None:
    """DB-level backstop: bypassing the service layer still can't create two
    active rows referencing the same from_transaction_id."""
    bank = await _make_account(db_session, "Bank")
    acc_b = await _make_account(db_session, "B")
    acc_c = await _make_account(db_session, "C")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    in_b = await _make_tx(
        db_session, account_id=_id(acc_b), amount=Decimal("50.00"), import_hash="h2"
    )
    in_c = await _make_tx(
        db_session, account_id=_id(acc_c), amount=Decimal("50.00"), import_hash="h3"
    )

    tc = table(TransferCandidate)
    await db_session.execute(
        insert(tc).values(
            from_transaction_id=_id(out_tx),
            to_transaction_id=_id(in_b),
            confidence=Decimal("0.90"),
            status="pending",
            source="auto",
        )
    )
    await db_session.commit()

    with pytest.raises(IntegrityError):
        await db_session.execute(
            insert(tc).values(
                from_transaction_id=_id(out_tx),
                to_transaction_id=_id(in_c),
                confidence=Decimal("0.90"),
                status="pending",
                source="auto",
            )
        )
        await db_session.commit()


@pytest.mark.asyncio
async def test_detect_claims_each_transaction_at_most_once_in_one_run(
    db_session: AsyncSession,
) -> None:
    """One outgoing transaction matching two equally-good incoming candidates
    in the same run yields exactly one candidate, not two."""
    bank = await _make_account(db_session, "Bank")
    acc_b = await _make_account(db_session, "B")
    acc_c = await _make_account(db_session, "C")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    await _make_tx(
        db_session, account_id=_id(acc_b), amount=Decimal("50.00"), import_hash="h2"
    )
    await _make_tx(
        db_session, account_id=_id(acc_c), amount=Decimal("50.00"), import_hash="h3"
    )

    candidates = await detect_transfer_candidates(db_session)

    assert len(candidates) == 1
    assert candidates[0].from_transaction_id == _id(out_tx)


@pytest.mark.asyncio
async def test_detect_skips_transaction_already_active_from_prior_run(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Bank")
    acc_b = await _make_account(db_session, "B")
    acc_c = await _make_account(db_session, "C")
    await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    await _make_tx(
        db_session, account_id=_id(acc_b), amount=Decimal("50.00"), import_hash="h2"
    )

    first_run = await detect_transfer_candidates(db_session)
    assert len(first_run) == 1

    # A second, later-arriving incoming transaction that would otherwise also
    # match out_tx must not produce a second candidate for it.
    await _make_tx(
        db_session,
        account_id=_id(acc_c),
        amount=Decimal("50.00"),
        import_hash="h3",
        booking_date=date(2026, 5, 2),
    )
    second_run = await detect_transfer_candidates(db_session)

    assert second_run == []


@pytest.mark.asyncio
async def test_confirm_transfer_rejects_when_leg_already_transferred(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Bank")
    savings = await _make_account(db_session, "Savings")
    other = await _make_account(db_session, "Other")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(savings), amount=Decimal("50.00"), import_hash="h2"
    )
    other_tx = await _make_tx(
        db_session, account_id=_id(other), amount=Decimal("30.00"), import_hash="h3"
    )

    tc = table(TransferCandidate)
    await db_session.execute(
        insert(tc).values(
            from_transaction_id=_id(out_tx),
            to_transaction_id=_id(in_tx),
            confidence=Decimal("1.00"),
            status="pending",
            source="auto",
        )
    )
    await db_session.commit()
    out_tx.is_transfer = True  # simulate: already confirmed via some other row
    await db_session.commit()

    candidate_row = (
        await db_session.execute(
            select(tc.c.id).where(tc.c.from_transaction_id == _id(out_tx))
        )
    ).first()
    candidate = await db_session.get(TransferCandidate, candidate_row.id)
    assert candidate is not None

    with pytest.raises(ConflictError):
        await confirm_transfer(db_session, candidate)

    # Unrelated transaction must not have been touched.
    await db_session.refresh(other_tx)
    assert other_tx.is_transfer is False


@pytest.mark.asyncio
async def test_confirm_transfer_dismisses_stale_pending_sibling(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Bank")
    savings = await _make_account(db_session, "Savings")
    other = await _make_account(db_session, "Other")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-50.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(savings), amount=Decimal("50.00"), import_hash="h2"
    )
    other_in = await _make_tx(
        db_session, account_id=_id(other), amount=Decimal("50.00"), import_hash="h3"
    )

    tc = table(TransferCandidate)
    # A stale pending candidate for out_tx against a *different* counterpart.
    await db_session.execute(
        insert(tc).values(
            from_transaction_id=_id(out_tx),
            to_transaction_id=_id(other_in),
            confidence=Decimal("0.80"),
            status="pending",
            source="auto",
        )
    )
    await db_session.commit()

    candidate = await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))
    await db_session.commit()

    assert candidate.status == "confirmed"

    stale_row = (
        await db_session.execute(
            select(tc.c.status).where(tc.c.to_transaction_id == _id(other_in))
        )
    ).first()
    assert stale_row.status == "dismissed"

    await db_session.refresh(other_in)
    assert other_in.is_transfer is False
