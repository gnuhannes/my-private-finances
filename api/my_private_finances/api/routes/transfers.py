from __future__ import annotations

from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.params import Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.deps import get_session
from my_private_finances.models import Account, Transaction
from my_private_finances.models.transfer_candidate import TransferCandidate
from my_private_finances.schemas import TransferCandidateRead, TransferLeg
from my_private_finances.services.transfer_detection import (
    confirm_transfer,
    detect_transfer_candidates,
    dismiss_transfer,
)

router = APIRouter(prefix="/transfers", tags=["transfers"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def _candidate_to_read(
    session: AsyncSession,
    candidate: TransferCandidate,
) -> TransferCandidateRead:
    assert candidate.id is not None

    from_tx = await session.get(Transaction, candidate.from_transaction_id)
    to_tx = await session.get(Transaction, candidate.to_transaction_id)

    if from_tx is None or to_tx is None:
        raise HTTPException(
            status_code=500, detail="Transfer candidate references missing transaction"
        )

    from_acc = await session.get(Account, from_tx.account_id)
    to_acc = await session.get(Account, to_tx.account_id)

    return TransferCandidateRead(
        id=candidate.id,
        from_leg=TransferLeg(
            transaction_id=from_tx.id,  # type: ignore[arg-type]
            account_id=from_tx.account_id,
            account_name=from_acc.name if from_acc else f"Account {from_tx.account_id}",
            booking_date=from_tx.booking_date,
            amount=from_tx.amount,
            payee=from_tx.payee,
        ),
        to_leg=TransferLeg(
            transaction_id=to_tx.id,  # type: ignore[arg-type]
            account_id=to_tx.account_id,
            account_name=to_acc.name if to_acc else f"Account {to_tx.account_id}",
            booking_date=to_tx.booking_date,
            amount=to_tx.amount,
            payee=to_tx.payee,
        ),
        confidence=candidate.confidence,
        status=candidate.status,
    )


@router.post("/detect", response_model=list[TransferCandidateRead], status_code=200)
async def trigger_detection(
    session: SessionDep,
) -> list[TransferCandidateRead]:
    """Detect inter-account transfer candidates across all accounts."""
    new_candidates = await detect_transfer_candidates(session)
    await session.commit()

    # Reload with IDs after commit
    tc = cast(Any, TransferCandidate).__table__
    stmt = (
        select(tc)
        .where(tc.c.status == "pending")
        .order_by(tc.c.id.desc())
        .limit(len(new_candidates) if new_candidates else 1)
    )
    _ = await session.execute(stmt)

    result = []
    for candidate in new_candidates:
        await session.refresh(candidate)
        result.append(await _candidate_to_read(session, candidate))
    return result


@router.get("/candidates", response_model=list[TransferCandidateRead])
async def list_candidates(
    session: SessionDep,
    status: Annotated[str | None, Query()] = None,
) -> list[TransferCandidateRead]:
    """List transfer candidates. Defaults to pending if no status filter given."""
    tc = cast(Any, TransferCandidate).__table__
    stmt = select(tc)
    filter_status = status if status is not None else "pending"
    stmt = stmt.where(tc.c.status == filter_status).order_by(tc.c.id)

    rows = (await session.execute(stmt)).all()

    candidates = []
    for row in rows:
        obj = TransferCandidate(
            id=row.id,
            from_transaction_id=row.from_transaction_id,
            to_transaction_id=row.to_transaction_id,
            confidence=row.confidence,
            status=row.status,
        )
        candidates.append(await _candidate_to_read(session, obj))
    return candidates


@router.post("/candidates/{candidate_id}/confirm", response_model=TransferCandidateRead)
async def confirm_candidate(
    candidate_id: int,
    session: SessionDep,
) -> TransferCandidateRead:
    """Confirm a transfer candidate: marks both transactions as is_transfer=True."""
    candidate = await session.get(TransferCandidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Transfer candidate not found")
    if candidate.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Candidate already {candidate.status}"
        )

    await confirm_transfer(session, candidate)
    await session.commit()
    await session.refresh(candidate)
    return await _candidate_to_read(session, candidate)


@router.post("/candidates/{candidate_id}/dismiss", response_model=TransferCandidateRead)
async def dismiss_candidate(
    candidate_id: int,
    session: SessionDep,
) -> TransferCandidateRead:
    """Dismiss a transfer candidate so it won't be re-suggested."""
    candidate = await session.get(TransferCandidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Transfer candidate not found")
    if candidate.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Candidate already {candidate.status}"
        )

    await dismiss_transfer(session, candidate)
    await session.commit()
    await session.refresh(candidate)
    return await _candidate_to_read(session, candidate)
