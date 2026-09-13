"""Tests for manual transfer linking (035 / #157).

Direct service-level tests register in pytest-cov (see conftest.db_session);
HTTP-level tests exercise the route wiring and status codes end to end.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import Account, Transaction
from my_private_finances.models.transfer_candidate import TransferCandidate
from my_private_finances.services.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from my_private_finances.services.transfer_detection import (
    create_manual_transfer,
    unlink_transfer,
)
from tests.helpers import create_account, create_transaction

API_PREFIX = "/api"


def _id(obj: Account | Transaction) -> int:
    """Non-optional accessor for a just-inserted-and-refreshed row's PK."""
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
    payee: str = "Test",
) -> Transaction:
    tx = Transaction(
        account_id=account_id,
        booking_date=booking_date,
        amount=amount,
        currency="EUR",
        payee=payee,
        import_source="manual",
        import_hash=import_hash,
    )
    session.add(tx)
    await session.commit()
    await session.refresh(tx)
    return tx


# ---------------------------------------------------------------------------
# Direct service-level tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_manual_transfer_happy_path(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    # Mismatched amount (fee) and date > 3 days apart — the case auto-detection misses.
    out_tx = await _make_tx(
        db_session,
        account_id=_id(bank),
        amount=Decimal("-50.25"),
        booking_date=date(2026, 5, 1),
        import_hash="h1",
    )
    in_tx = await _make_tx(
        db_session,
        account_id=_id(paypal),
        amount=Decimal("50.00"),
        booking_date=date(2026, 5, 6),
        import_hash="h2",
    )

    candidate = await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))

    assert candidate.status == "confirmed"
    assert candidate.source == "manual"
    assert candidate.confidence == Decimal("1.00")

    await db_session.refresh(out_tx)
    await db_session.refresh(in_tx)
    assert out_tx.is_transfer is True
    assert in_tx.is_transfer is True


@pytest.mark.asyncio
async def test_create_manual_transfer_same_transaction(
    db_session: AsyncSession,
) -> None:
    acc = await _make_account(db_session, "Bank")
    tx = await _make_tx(
        db_session, account_id=_id(acc), amount=Decimal("-10.00"), import_hash="h1"
    )

    with pytest.raises(ValidationError):
        await create_manual_transfer(db_session, _id(tx), _id(tx))


@pytest.mark.asyncio
async def test_create_manual_transfer_from_not_found(db_session: AsyncSession) -> None:
    paypal = await _make_account(db_session, "PayPal")
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h1"
    )

    with pytest.raises(NotFoundError):
        await create_manual_transfer(db_session, 9999, _id(in_tx))


@pytest.mark.asyncio
async def test_create_manual_transfer_to_not_found(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )

    with pytest.raises(NotFoundError):
        await create_manual_transfer(db_session, _id(out_tx), 9999)


@pytest.mark.asyncio
async def test_create_manual_transfer_same_account(db_session: AsyncSession) -> None:
    acc = await _make_account(db_session, "Bank")
    out_tx = await _make_tx(
        db_session, account_id=_id(acc), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(acc), amount=Decimal("10.00"), import_hash="h2"
    )

    with pytest.raises(ValidationError):
        await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))


@pytest.mark.asyncio
async def test_create_manual_transfer_wrong_polarity(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    # Both positive: 'from' must be the outgoing (negative) leg.
    from_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("10.00"), import_hash="h1"
    )
    to_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )

    with pytest.raises(ValidationError):
        await create_manual_transfer(db_session, _id(from_tx), _id(to_tx))


@pytest.mark.asyncio
async def test_create_manual_transfer_already_transfer(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )
    other_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h3"
    )

    await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))

    with pytest.raises(ConflictError):
        await create_manual_transfer(db_session, _id(out_tx), _id(other_tx))


@pytest.mark.asyncio
async def test_create_manual_transfer_blocked_by_pending_candidate(
    db_session: AsyncSession,
) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )
    pending = TransferCandidate(
        from_transaction_id=_id(out_tx),
        to_transaction_id=_id(in_tx),
        confidence=Decimal("0.90"),
        status="pending",
    )
    db_session.add(pending)
    await db_session.commit()

    with pytest.raises(ConflictError):
        await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))


@pytest.mark.asyncio
async def test_unlink_transfer_reverses_flags(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )
    candidate = await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))

    await unlink_transfer(db_session, candidate)

    assert candidate.status == "unlinked"
    await db_session.refresh(out_tx)
    await db_session.refresh(in_tx)
    assert out_tx.is_transfer is False
    assert in_tx.is_transfer is False


@pytest.mark.asyncio
async def test_unlink_transfer_not_confirmed(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )
    pending = TransferCandidate(
        from_transaction_id=_id(out_tx),
        to_transaction_id=_id(in_tx),
        confidence=Decimal("0.90"),
        status="pending",
    )
    db_session.add(pending)
    await db_session.commit()
    await db_session.refresh(pending)

    with pytest.raises(ConflictError):
        await unlink_transfer(db_session, pending)


@pytest.mark.asyncio
async def test_relink_after_unlink_reuses_row(db_session: AsyncSession) -> None:
    bank = await _make_account(db_session, "Bank")
    paypal = await _make_account(db_session, "PayPal")
    out_tx = await _make_tx(
        db_session, account_id=_id(bank), amount=Decimal("-10.00"), import_hash="h1"
    )
    in_tx = await _make_tx(
        db_session, account_id=_id(paypal), amount=Decimal("10.00"), import_hash="h2"
    )

    first = await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))
    await unlink_transfer(db_session, first)

    second = await create_manual_transfer(db_session, _id(out_tx), _id(in_tx))

    # Same row reused (unique constraint on the pair), not a duplicate insert.
    assert second.id == first.id
    assert second.status == "confirmed"

    await db_session.refresh(out_tx)
    await db_session.refresh(in_tx)
    assert out_tx.is_transfer is True
    assert in_tx.is_transfer is True


# ---------------------------------------------------------------------------
# HTTP-level tests (route wiring, status codes)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_manual_transfer_http_success(test_app: AsyncClient) -> None:
    bank = await create_account(test_app, name="Bank")
    paypal = await create_account(test_app, name="PayPal")
    out_tx = await create_transaction(
        test_app,
        account_id=bank["id"],
        amount="-50.25",
        booking_date="2026-05-01",
        external_id="m1",
    )
    in_tx = await create_transaction(
        test_app,
        account_id=paypal["id"],
        amount="50.00",
        booking_date="2026-05-06",
        external_id="m2",
    )

    res = await test_app.post(
        f"{API_PREFIX}/transfers/manual",
        json={"from_transaction_id": out_tx["id"], "to_transaction_id": in_tx["id"]},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "confirmed"
    assert body["source"] == "manual"
    assert body["from_leg"]["transaction_id"] == out_tx["id"]
    assert body["to_leg"]["transaction_id"] == in_tx["id"]


@pytest.mark.asyncio
async def test_manual_transfer_http_validation_error(test_app: AsyncClient) -> None:
    bank = await create_account(test_app, name="Bank")
    tx1 = await create_transaction(
        test_app, account_id=bank["id"], amount="-10.00", external_id="v1"
    )
    tx2 = await create_transaction(
        test_app, account_id=bank["id"], amount="10.00", external_id="v2"
    )

    res = await test_app.post(
        f"{API_PREFIX}/transfers/manual",
        json={"from_transaction_id": tx1["id"], "to_transaction_id": tx2["id"]},
    )
    assert res.status_code == 422, res.text


@pytest.mark.asyncio
async def test_manual_transfer_http_not_found(test_app: AsyncClient) -> None:
    bank = await create_account(test_app, name="Bank")
    tx1 = await create_transaction(
        test_app, account_id=bank["id"], amount="-10.00", external_id="n1"
    )

    res = await test_app.post(
        f"{API_PREFIX}/transfers/manual",
        json={"from_transaction_id": tx1["id"], "to_transaction_id": 9999},
    )
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_unlink_http_flow(test_app: AsyncClient) -> None:
    bank = await create_account(test_app, name="Bank")
    paypal = await create_account(test_app, name="PayPal")
    out_tx = await create_transaction(
        test_app, account_id=bank["id"], amount="-10.00", external_id="u1"
    )
    in_tx = await create_transaction(
        test_app, account_id=paypal["id"], amount="10.00", external_id="u2"
    )

    create_res = await test_app.post(
        f"{API_PREFIX}/transfers/manual",
        json={"from_transaction_id": out_tx["id"], "to_transaction_id": in_tx["id"]},
    )
    assert create_res.status_code == 201, create_res.text
    candidate_id = create_res.json()["id"]

    unlink_res = await test_app.post(
        f"{API_PREFIX}/transfers/candidates/{candidate_id}/unlink"
    )
    assert unlink_res.status_code == 200, unlink_res.text
    assert unlink_res.json()["status"] == "unlinked"

    list_res = await test_app.get(
        f"{API_PREFIX}/transactions", params={"account_id": bank["id"]}
    )
    items = list_res.json()["items"]
    assert next(i for i in items if i["id"] == out_tx["id"])["is_transfer"] is False


@pytest.mark.asyncio
async def test_unlink_http_not_found(test_app: AsyncClient) -> None:
    res = await test_app.post(f"{API_PREFIX}/transfers/candidates/9999/unlink")
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_unlink_http_not_confirmed(test_app: AsyncClient) -> None:
    bank = await create_account(test_app, name="Bank")
    paypal = await create_account(test_app, name="PayPal")
    # Same amount, same day -> a legitimate auto-detect candidate, left pending.
    await create_transaction(
        test_app, account_id=bank["id"], amount="-25.00", external_id="p1"
    )
    await create_transaction(
        test_app, account_id=paypal["id"], amount="25.00", external_id="p2"
    )

    detect_res = await test_app.post(f"{API_PREFIX}/transfers/detect")
    assert detect_res.status_code == 200, detect_res.text
    candidates = detect_res.json()
    assert len(candidates) == 1
    candidate_id = candidates[0]["id"]

    unlink_res = await test_app.post(
        f"{API_PREFIX}/transfers/candidates/{candidate_id}/unlink"
    )
    assert unlink_res.status_code == 409, unlink_res.text
