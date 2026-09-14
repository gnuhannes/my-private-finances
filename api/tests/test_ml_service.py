from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import joblib
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.models import (
    Account,
    CategorizationRule,
    Category,
    MLModelState,
    Transaction,
    TransactionSplit,
)
from my_private_finances.services import ml_categorization
from my_private_finances.services.ml_categorization import (
    RETRAIN_AFTER_N_CATEGORIZATIONS,
    ColdStartError,
    maybe_retrain_after_import,
    note_manual_categorization,
    suggest,
    train,
)


@pytest.fixture(autouse=True)
def _reset_model_cache() -> None:
    # The in-process pipeline cache is a module-level singleton (see
    # `_ModelCache` in ml_categorization.py) so it survives across tests
    # within the same run; each test uses its own tmp_path model file, but
    # reset explicitly for determinism regardless of execution order.
    ml_categorization._model_cache.invalidate()


async def _seed_account(db_session: AsyncSession) -> int:
    account = Account(name="Main", currency="EUR")
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)
    assert account.id is not None
    return account.id


def _make_tx(
    account_id: int,
    import_hash: str,
    category_id: int | None = None,
    payee: str = "REWE",
    purpose: str = "Groceries",
) -> Transaction:
    return Transaction(
        account_id=account_id,
        booking_date=date(2026, 1, 15),
        amount=Decimal("42.00"),
        currency="EUR",
        payee=payee,
        purpose=purpose,
        category_id=category_id,
        import_hash=import_hash,
    )


@pytest.mark.asyncio
async def test_train_insufficient_data_raises_cold_start(
    db_session: AsyncSession,
) -> None:
    # Add fewer than 10 categorized transactions
    account_id = await _seed_account(db_session)
    cat = Category(name="Groceries")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    for i in range(5):
        db_session.add(_make_tx(account_id, f"hash-{i}", category_id=cat.id))
    await db_session.commit()

    with pytest.raises(ColdStartError):
        await train(db_session)


@pytest.mark.asyncio
async def test_train_returns_stats(db_session: AsyncSession, tmp_path: Path) -> None:
    account_id = await _seed_account(db_session)
    cat1 = Category(name="Groceries")
    cat2 = Category(name="Transport")
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.commit()
    await db_session.refresh(cat1)
    await db_session.refresh(cat2)

    for i in range(6):
        db_session.add(
            _make_tx(account_id, f"hash-g{i}", category_id=cat1.id, payee="REWE")
        )
    for i in range(6):
        db_session.add(
            _make_tx(
                account_id,
                f"hash-t{i}",
                category_id=cat2.id,
                payee="BVG",
                purpose="Transport",
            )
        )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        result = await train(db_session)

    assert result.num_samples == 12
    assert result.num_categories == 2
    assert model_path.exists()


@pytest.mark.asyncio
async def test_train_excludes_split_transactions(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id = await _seed_account(db_session)
    cat1 = Category(name="Groceries")
    cat2 = Category(name="Transport")
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.commit()
    await db_session.refresh(cat1)
    await db_session.refresh(cat2)

    for i in range(6):
        db_session.add(
            _make_tx(account_id, f"hash-g{i}", category_id=cat1.id, payee="REWE")
        )
    for i in range(6):
        db_session.add(
            _make_tx(
                account_id,
                f"hash-t{i}",
                category_id=cat2.id,
                payee="BVG",
                purpose="Transport",
            )
        )
    await db_session.commit()

    # A transaction that still carries a category_id but has splits — the
    # 409 guard on PATCH prevents this via the API, but train() must not
    # rely on that alone: it's an ambiguous label either way.
    split_tx = _make_tx(account_id, "hash-split", category_id=cat1.id, payee="RENT")
    db_session.add(split_tx)
    await db_session.commit()
    await db_session.refresh(split_tx)
    db_session.add(
        TransactionSplit(
            transaction_id=split_tx.id, category_id=cat1.id, amount=Decimal("42.00")
        )
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        result = await train(db_session)

    assert result.num_samples == 12


@pytest.mark.asyncio
async def test_suggest_returns_predictions(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id = await _seed_account(db_session)
    cat1 = Category(name="Groceries")
    cat2 = Category(name="Transport")
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.commit()
    await db_session.refresh(cat1)
    await db_session.refresh(cat2)

    for i in range(6):
        db_session.add(
            _make_tx(account_id, f"hash-g{i}", category_id=cat1.id, payee="REWE")
        )
    for i in range(6):
        db_session.add(
            _make_tx(
                account_id,
                f"hash-t{i}",
                category_id=cat2.id,
                payee="BVG",
                purpose="Transport",
            )
        )
    # Add uncategorized transaction
    db_session.add(
        _make_tx(account_id, "hash-uncat", category_id=None, payee="REWE Markt")
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await train(db_session)
        suggestions = await suggest(db_session)

    assert len(suggestions) == 1
    s = suggestions[0]
    assert s.category_id in (cat1.id, cat2.id)
    assert 0.0 <= s.confidence <= 1.0
    assert s.payee == "REWE Markt"


@pytest.mark.asyncio
async def test_suggest_excludes_split_transactions(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id = await _seed_account(db_session)
    cat1 = Category(name="Groceries")
    cat2 = Category(name="Transport")
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.commit()
    await db_session.refresh(cat1)
    await db_session.refresh(cat2)

    for i in range(6):
        db_session.add(
            _make_tx(account_id, f"hash-g{i}", category_id=cat1.id, payee="REWE")
        )
    for i in range(6):
        db_session.add(
            _make_tx(
                account_id,
                f"hash-t{i}",
                category_id=cat2.id,
                payee="BVG",
                purpose="Transport",
            )
        )
    # A genuinely uncategorized transaction: should get a suggestion.
    db_session.add(
        _make_tx(account_id, "hash-uncat", category_id=None, payee="REWE Markt")
    )
    await db_session.commit()

    # A split transaction: category_id is None too, but it's already
    # resolved via its splits and must not be offered a suggestion.
    split_tx = _make_tx(account_id, "hash-split", category_id=None, payee="REWE Split")
    db_session.add(split_tx)
    await db_session.commit()
    await db_session.refresh(split_tx)
    db_session.add(
        TransactionSplit(
            transaction_id=split_tx.id, category_id=cat1.id, amount=Decimal("10.00")
        )
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await train(db_session)
        suggestions = await suggest(db_session)

    assert len(suggestions) == 1
    assert suggestions[0].payee == "REWE Markt"


@pytest.mark.asyncio
async def test_suggest_no_model_raises(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    missing_path = tmp_path / "nonexistent.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=missing_path,
    ):
        with pytest.raises(ColdStartError):
            await suggest(db_session)


async def _seed_two_category_dataset(
    db_session: AsyncSession,
) -> tuple[int, int, int]:
    """6 REWE/Groceries + 6 BVG/Transport rows. Returns (account_id, cat1_id, cat2_id)."""
    account_id = await _seed_account(db_session)
    cat1 = Category(name="Groceries")
    cat2 = Category(name="Transport")
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.commit()
    await db_session.refresh(cat1)
    await db_session.refresh(cat2)
    assert cat1.id is not None
    assert cat2.id is not None

    for i in range(6):
        db_session.add(
            _make_tx(account_id, f"hash-g{i}", category_id=cat1.id, payee="REWE")
        )
    for i in range(6):
        db_session.add(
            _make_tx(
                account_id,
                f"hash-t{i}",
                category_id=cat2.id,
                payee="BVG",
                purpose="Transport",
            )
        )
    await db_session.commit()
    return account_id, cat1.id, cat2.id


@pytest.mark.asyncio
async def test_train_reports_cv_accuracy(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    await _seed_two_category_dataset(db_session)

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        result = await train(db_session)

    assert result.cv_accuracy is not None
    assert 0.0 <= result.cv_accuracy <= 1.0


@pytest.mark.asyncio
async def test_train_with_single_category_raises_cold_start(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    # Enough *samples* (>= MIN_SAMPLES) but only one category — a classifier
    # needs >=2 classes to discriminate between, so this is cold-start too.
    account_id = await _seed_account(db_session)
    cat = Category(name="Groceries")
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    for i in range(10):
        db_session.add(_make_tx(account_id, f"hash-{i}", category_id=cat.id))
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        with pytest.raises(ColdStartError):
            await train(db_session)


@pytest.mark.asyncio
async def test_suggest_caches_pipeline_across_calls(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id, _cat1, _cat2 = await _seed_two_category_dataset(db_session)
    db_session.add(
        _make_tx(account_id, "hash-uncat", category_id=None, payee="REWE Markt")
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await train(db_session)
        with patch.object(joblib, "load", wraps=joblib.load) as load_spy:
            await suggest(db_session)
            await suggest(db_session)
            assert load_spy.call_count == 1


@pytest.mark.asyncio
async def test_suggest_skips_transactions_a_rule_would_claim(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id, cat1, cat2 = await _seed_two_category_dataset(db_session)

    db_session.add(
        CategorizationRule(
            position=1,
            field="payee",
            operator="contains",
            value="REWE",
            category_id=cat1,
        )
    )
    # Would be claimed by the rule above:
    db_session.add(
        _make_tx(account_id, "hash-rule-claimed", category_id=None, payee="REWE Markt")
    )
    # No rule matches this one:
    db_session.add(
        _make_tx(
            account_id,
            "hash-ml-only",
            category_id=None,
            payee="Unknown Shop",
            purpose="Misc",
        )
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await train(db_session)
        suggestions = await suggest(db_session)

    payees = {s.payee for s in suggestions}
    assert "REWE Markt" not in payees
    assert "Unknown Shop" in payees


@pytest.mark.asyncio
async def test_suggest_handles_missing_purpose_and_no_recurring_pattern(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    account_id, cat1, _cat2 = await _seed_two_category_dataset(db_session)
    db_session.add(
        _make_tx(
            account_id, "hash-nopurpose", category_id=None, payee="REWE", purpose=None
        )
    )
    await db_session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await train(db_session)
        suggestions = await suggest(db_session)

    assert len(suggestions) == 1
    assert suggestions[0].purpose is None


@pytest.mark.asyncio
async def test_note_manual_categorization_retrains_after_threshold(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    await _seed_two_category_dataset(db_session)

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        for _ in range(RETRAIN_AFTER_N_CATEGORIZATIONS - 1):
            await note_manual_categorization(db_session)
        assert not model_path.exists()

        await note_manual_categorization(db_session)
        assert model_path.exists()

    state = await db_session.get(MLModelState, 1)
    assert state is not None
    assert state.categorizations_since_train == 0
    assert state.last_trained_at is not None


@pytest.mark.asyncio
async def test_maybe_retrain_after_import_swallows_cold_start(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await maybe_retrain_after_import(db_session)  # no categorized data yet
    assert not model_path.exists()


@pytest.mark.asyncio
async def test_maybe_retrain_after_import_trains_when_enough_data(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    await _seed_two_category_dataset(db_session)

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        await maybe_retrain_after_import(db_session)

    assert model_path.exists()
