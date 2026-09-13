"""Transfer detection service.

Detects candidate inter-account transfers by matching transactions across accounts
where:
  - One leg is negative (outgoing) and the other is positive (incoming)
  - abs(amount_A) == abs(amount_B)
  - |date_A - date_B| <= window_days (default 3)
  - The pair is not already tracked in TransferCandidate with any status
  - Neither leg is already the subject of another active (pending/confirmed)
    candidate — a transaction can be part of at most one transfer; enforced
    at the DB level by the partial unique indexes on TransferCandidate.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.models.transfer_candidate import TransferCandidate
from my_private_finances.services.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from my_private_finances.utils.money import money_from_db
from my_private_finances.utils.sql import table

logger = logging.getLogger(__name__)


async def detect_transfer_candidates(
    session: AsyncSession,
    window_days: int = 3,
) -> list[TransferCandidate]:
    """Detect inter-account transfer candidates across all accounts.

    Skips pairs that are already in TransferCandidate (any status), and skips
    any transaction that already has an active (pending/confirmed) candidate
    — whether from a prior detection run or a manual link — so it's never
    proposed a second time against a different counterpart.
    Returns newly created TransferCandidate rows (status='pending').
    """
    tx = table(Transaction)
    acc = table(Account)

    # Load all transactions with account info. Cash accounts have no external
    # statement to reconcile against, so they're excluded here — 090's design:
    # cash transfers are manual-linking only (see create_manual_transfer).
    # Already-transferred transactions are excluded too — a transaction can
    # only be part of one transfer.
    stmt = (
        select(
            tx.c.id,
            tx.c.account_id,
            tx.c.booking_date,
            tx.c.amount,
            tx.c.payee,
        )
        .select_from(tx.join(acc, tx.c.account_id == acc.c.id))
        .where(acc.c.account_type != "cash", tx.c.is_transfer == False)  # noqa: E712
        .order_by(tx.c.booking_date, tx.c.amount)
    )
    rows = (await session.execute(stmt)).all()
    logger.info(
        "Transfer detection started: window_days=%d, transactions=%d",
        window_days,
        len(rows),
    )

    # Split into negative (outgoing) and positive (incoming) buckets
    outgoing = [r for r in rows if r.amount < 0]
    incoming = [r for r in rows if r.amount > 0]

    # Load already-tracked pairs (any status) and transactions already
    # claimed by an active candidate, to avoid duplicates.
    tc = table(TransferCandidate)
    existing_stmt = select(
        tc.c.from_transaction_id, tc.c.to_transaction_id, tc.c.status
    )
    existing_rows = (await session.execute(existing_stmt)).all()
    existing_pairs: set[tuple[int, int]] = {
        (r.from_transaction_id, r.to_transaction_id) for r in existing_rows
    }
    active_tx_ids: set[int] = {
        tid
        for r in existing_rows
        if r.status in ("pending", "confirmed")
        for tid in (r.from_transaction_id, r.to_transaction_id)
    }

    new_candidates: list[TransferCandidate] = []
    window = timedelta(days=window_days)

    for out_tx in outgoing:
        if out_tx.id in active_tx_ids:
            continue
        out_abs = abs(money_from_db(out_tx.amount))

        for in_tx in incoming:
            if in_tx.id in active_tx_ids:
                continue
            # Must be different accounts
            if out_tx.account_id == in_tx.account_id:
                continue

            # Amount must match exactly
            in_abs = money_from_db(in_tx.amount)
            if out_abs != in_abs:
                continue

            # Date must be within window
            date_diff = abs(out_tx.booking_date - in_tx.booking_date)
            if date_diff > window:
                continue

            # Skip already-tracked pairs
            pair = (out_tx.id, in_tx.id)
            if pair in existing_pairs:
                continue

            # Confidence: starts at 1.0, reduced by 0.1 per day of date spread
            confidence = Decimal("1.0") - Decimal("0.1") * Decimal(str(date_diff.days))
            confidence = max(confidence, Decimal("0.70"))

            candidate = TransferCandidate(
                from_transaction_id=out_tx.id,
                to_transaction_id=in_tx.id,
                confidence=confidence,
                status="pending",
            )
            session.add(candidate)
            new_candidates.append(candidate)
            existing_pairs.add(pair)
            active_tx_ids.add(out_tx.id)
            active_tx_ids.add(in_tx.id)
            # out_tx is now claimed — a transaction can match at most one
            # candidate, so stop looking for further incoming matches for it.
            break

    await session.flush()
    logger.info(
        "Transfer detection complete: %d new candidates found", len(new_candidates)
    )
    return new_candidates


async def _dismiss_stale_siblings(
    session: AsyncSession,
    from_transaction_id: int,
    to_transaction_id: int,
    keep_candidate_id: int | None,
) -> None:
    """Dismiss any other still-pending candidate referencing either leg.

    A transaction can be the subject of at most one active (pending/confirmed)
    candidate at a time — enforced by the partial unique indexes on
    TransferCandidate. Without this, confirming one candidate while a stale
    pending sibling for the same transaction still exists would either
    violate that index, or (before the index existed) let a later confirm of
    the stale sibling silently flip an unrelated transaction's is_transfer.

    Runs (and flushes) before the caller adds or mutates its own candidate
    row, so a brand-new INSERT never transiently collides with a sibling
    still marked "pending" under the partial unique index.
    """
    tc = table(TransferCandidate)
    ids = (from_transaction_id, to_transaction_id)
    conditions = [
        tc.c.status == "pending",
        or_(tc.c.from_transaction_id.in_(ids), tc.c.to_transaction_id.in_(ids)),
    ]
    if keep_candidate_id is not None:
        conditions.append(tc.c.id != keep_candidate_id)

    with session.no_autoflush:
        stale_ids = [
            row.id
            for row in (await session.execute(select(tc.c.id).where(*conditions))).all()
        ]
        for stale_id in stale_ids:
            stale = await session.get(TransferCandidate, stale_id)
            if stale is not None:
                stale.status = "dismissed"

    if stale_ids:
        await session.flush()
        logger.info(
            "Dismissed %d stale pending candidate(s) referencing tx %s/%s",
            len(stale_ids),
            from_transaction_id,
            to_transaction_id,
        )


async def confirm_transfer(session: AsyncSession, candidate: TransferCandidate) -> None:
    """Mark both transaction legs as transfers and set candidate status to confirmed.

    Rejects if either leg is already part of a transfer — defense in depth:
    detect_transfer_candidates and create_manual_transfer both avoid ever
    creating such a candidate, but this guard also protects the plain
    auto-confirm route, which has no validation of its own. Dismisses any
    other still-pending candidate referencing either leg first (see
    _dismiss_stale_siblings) so the partial unique indexes are never violated.
    """
    from_tx = await session.get(Transaction, candidate.from_transaction_id)
    to_tx = await session.get(Transaction, candidate.to_transaction_id)

    if (from_tx is not None and from_tx.is_transfer) or (
        to_tx is not None and to_tx.is_transfer
    ):
        raise ConflictError("One of these transactions is already part of a transfer")

    await _dismiss_stale_siblings(
        session,
        candidate.from_transaction_id,
        candidate.to_transaction_id,
        candidate.id,
    )

    candidate.status = "confirmed"
    if from_tx is not None:
        from_tx.is_transfer = True
    if to_tx is not None:
        to_tx.is_transfer = True

    await session.flush()
    logger.info(
        "Transfer confirmed: candidate_id=%s (tx %s → %s)",
        candidate.id,
        candidate.from_transaction_id,
        candidate.to_transaction_id,
    )


async def dismiss_transfer(session: AsyncSession, candidate: TransferCandidate) -> None:
    """Mark candidate as dismissed so it won't be re-suggested."""
    candidate.status = "dismissed"
    await session.flush()
    logger.info(
        "Transfer dismissed: candidate_id=%s (tx %s → %s)",
        candidate.id,
        candidate.from_transaction_id,
        candidate.to_transaction_id,
    )


async def create_manual_transfer(
    session: AsyncSession,
    from_transaction_id: int,
    to_transaction_id: int,
) -> TransferCandidate:
    """Manually pair two transactions across accounts as a transfer and confirm it.

    Skips the amount/date match ``detect_transfer_candidates`` requires — for
    transfers through an intermediary (fees, FX spread) or slow transfers that
    never produce an auto-detected candidate. Unlike ``confirm_transfer`` /
    ``dismiss_transfer`` (which assume the caller already validated candidate
    state), this validates eligibility itself since there is no pre-existing
    candidate to have been reviewed.
    """
    if from_transaction_id == to_transaction_id:
        raise ValidationError("A transaction cannot be paired with itself")

    from_tx = await session.get(Transaction, from_transaction_id)
    if from_tx is None:
        raise NotFoundError(f"Transaction {from_transaction_id} not found")
    to_tx = await session.get(Transaction, to_transaction_id)
    if to_tx is None:
        raise NotFoundError(f"Transaction {to_transaction_id} not found")

    if from_tx.account_id == to_tx.account_id:
        raise ValidationError("Both legs of a transfer must be in different accounts")
    if from_tx.amount >= 0 or to_tx.amount <= 0:
        raise ValidationError(
            "'from' must be the outgoing (negative) leg and 'to' the incoming "
            "(positive) leg"
        )
    if from_tx.is_transfer or to_tx.is_transfer:
        raise ConflictError("One of these transactions is already part of a transfer")

    # (from_transaction_id, to_transaction_id) carries a DB-level unique
    # constraint regardless of status, so a pair that was previously dismissed
    # or unlinked must reuse that row rather than insert a duplicate — only a
    # still-active (pending/confirmed) row for this exact pair is a conflict.
    tc = table(TransferCandidate)
    existing_stmt = select(tc.c.id, tc.c.status).where(
        tc.c.from_transaction_id == from_transaction_id,
        tc.c.to_transaction_id == to_transaction_id,
    )
    existing_row = (await session.execute(existing_stmt)).first()
    if existing_row is not None and existing_row.status in ("pending", "confirmed"):
        raise ConflictError("This pair is already tracked as a transfer")

    # Dismiss any other still-pending candidate for either leg *before*
    # constructing/adding this candidate — if this ends up being a brand-new
    # row, doing this first (and flushing) keeps that INSERT from ever
    # transiently colliding with a stale sibling under the partial unique
    # indexes. confirm_transfer() below repeats this call (a cheap no-op by
    # then) so the plain auto-confirm route gets the same protection.
    await _dismiss_stale_siblings(
        session,
        from_transaction_id,
        to_transaction_id,
        keep_candidate_id=existing_row.id if existing_row is not None else None,
    )

    if existing_row is not None:
        candidate = await session.get(TransferCandidate, existing_row.id)
        assert candidate is not None
        candidate.confidence = Decimal("1.00")
        candidate.source = "manual"
    else:
        candidate = TransferCandidate(
            from_transaction_id=from_transaction_id,
            to_transaction_id=to_transaction_id,
            confidence=Decimal("1.00"),
            source="manual",
        )
        session.add(candidate)
    await confirm_transfer(session, candidate)
    logger.info(
        "Manual transfer created: candidate_id=%s (tx %s → %s)",
        candidate.id,
        from_transaction_id,
        to_transaction_id,
    )
    return candidate


async def unlink_transfer(session: AsyncSession, candidate: TransferCandidate) -> None:
    """Reverse a confirmed transfer, restoring both legs to normal reporting.

    Works for auto-detected and manually-linked candidates alike.
    """
    if candidate.status != "confirmed":
        raise ConflictError(f"Candidate is not confirmed (status={candidate.status})")

    candidate.status = "unlinked"

    from_tx = await session.get(Transaction, candidate.from_transaction_id)
    to_tx = await session.get(Transaction, candidate.to_transaction_id)

    if from_tx is not None:
        from_tx.is_transfer = False
    if to_tx is not None:
        to_tx.is_transfer = False

    await session.flush()
    logger.info(
        "Transfer unlinked: candidate_id=%s (tx %s → %s)",
        candidate.id,
        candidate.from_transaction_id,
        candidate.to_transaction_id,
    )
