from __future__ import annotations

import logging
import math
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
from fastapi.concurrency import run_in_threadpool
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, MaxAbsScaler
from sqlalchemy import literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from my_private_finances.config import get_settings
from my_private_finances.models import (
    Category,
    MLModelState,
    RecurringPattern,
    Transaction,
    TransactionSplit,
)
from my_private_finances.schemas.ml import Suggestion, TrainResult
from my_private_finances.services.categorization import (
    load_rules_ordered,
    match_transaction,
)
from my_private_finances.services.exceptions import ServiceError

logger = logging.getLogger(__name__)

MIN_SAMPLES = 10

# After this many manual (PATCH) categorizations since the last train, the next
# one triggers a background retrain automatically (see `note_manual_categorization`).
RETRAIN_AFTER_N_CATEGORIZATIONS = 20

# An ML suggestion at or above this confidence is flagged as a good candidate to
# promote into an explicit categorization rule.
RULE_SUGGESTION_CONFIDENCE_THRESHOLD = 0.85

_STATE_ID = 1


def _not_split() -> Any:
    """``NOT EXISTS`` clause excluding transactions that have splits.

    A split transaction's own ``category_id`` is already ``NULL`` (the
    split portions carry the categories instead), so it's ambiguous as a
    training label and shouldn't be offered a suggestion either.
    """
    return ~(
        select(literal(1))
        .select_from(TransactionSplit)
        .where(TransactionSplit.transaction_id == Transaction.id)  # type: ignore[arg-type]
        .exists()
    )


class ColdStartError(ServiceError):
    """Not enough categorized transactions to train / no model trained yet."""

    status_code = 400
    default_detail = "Not enough categorized transactions to train a model"


def _model_path() -> Path:
    return get_settings().ml_model_path


def _feature_text(tx: Transaction) -> str:
    parts = [tx.payee or "", tx.purpose or ""]
    return " ".join(parts).strip()


def _amount_magnitude(amount: Any) -> float:
    return math.log1p(abs(float(amount)))


def _feature_row(
    tx: Transaction, recurring_keys: set[tuple[int, str]]
) -> dict[str, Any]:
    """Build the raw feature dict fed into the pipeline for one transaction.

    Money (``tx.amount``) stays a `Decimal` everywhere else in the codebase;
    converting to `float` here is fine — it only ever feeds a numeric ML
    feature, never a response field.
    """
    is_recurring = (tx.account_id, tx.payee or "") in recurring_keys
    return {
        "text": _feature_text(tx),
        "numeric": [
            _amount_magnitude(tx.amount),
            1.0 if tx.amount >= 0 else -1.0,
            tx.booking_date.day / 31.0,
            1.0 if is_recurring else 0.0,
        ],
    }


def _select_text(rows: list[dict[str, Any]]) -> list[str]:
    return [row["text"] for row in rows]


def _select_numeric(rows: list[dict[str, Any]]) -> list[list[float]]:
    return [row["numeric"] for row in rows]


def _build_pipeline() -> Pipeline:
    # `char_wb(2,4)` (down from `(2,5)`) plus `min_df=2` trims the vocabulary —
    # and therefore the on-disk model size / load time — with negligible loss
    # on short payee/purpose strings, where 5-grams rarely recur across rows.
    text_branch = Pipeline(
        [
            ("select", FunctionTransformer(_select_text)),
            (
                "tfidf",
                TfidfVectorizer(
                    sublinear_tf=True,
                    analyzer="char_wb",
                    ngram_range=(2, 4),
                    min_df=2,
                ),
            ),
        ]
    )
    # Amount magnitude/sign, day-of-month, and recurring-payee flag alongside
    # the text features. `ColumnTransformer` needs a DataFrame or 2D array for
    # named-column selection; this repo has no pandas dependency (and adding
    # one for this would violate the "no new runtime deps" constraint), so a
    # `FeatureUnion` of small selector branches gets the same heterogeneous
    # feature combination over plain feature-dict rows.
    numeric_branch = Pipeline(
        [
            ("select", FunctionTransformer(_select_numeric)),
            ("scale", MaxAbsScaler()),
        ]
    )
    features = FeatureUnion([("text", text_branch), ("numeric", numeric_branch)])
    return Pipeline(
        [
            ("features", features),
            (
                "clf",
                LogisticRegression(max_iter=1000, class_weight="balanced"),
            ),
        ]
    )


def _cross_val_accuracy(rows: list[dict[str, Any]], labels: list[Any]) -> float | None:
    counts = Counter(labels)
    if len(counts) < 2:
        return None
    min_class_count = min(counts.values())
    if min_class_count < 2:
        return None
    n_splits = min(5, min_class_count)
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    scores = cross_val_score(_build_pipeline(), rows, labels, cv=cv, scoring="accuracy")
    return float(scores.mean())


def _fit_score_and_save(
    rows: list[dict[str, Any]], labels: list[Any], model_path: Path
) -> float | None:
    """CPU-bound: score via CV, fit the pipeline on all data, and persist it.

    Runs in a worker thread — never call directly from a route/service coroutine.
    """
    cv_accuracy = _cross_val_accuracy(rows, labels)
    pipeline = _build_pipeline()
    pipeline.fit(rows, labels)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    return cv_accuracy


class _ModelCache:
    """Process-wide cache for the fitted pipeline, invalidated by mtime.

    A literal `app.state` cache (as the issue suggests) would require every
    caller of `suggest()` to thread a `Request` through the service layer —
    this app has exactly one `FastAPI` instance per process, so a
    module-level cache guarded by a lock is equivalent and keeps the service
    layer's signature (`AsyncSession` only) unchanged.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._path: Path | None = None
        self._mtime: float | None = None
        self._pipeline: Pipeline | None = None

    def load(self, model_path: Path) -> Pipeline:
        mtime = model_path.stat().st_mtime
        with self._lock:
            if (
                self._pipeline is not None
                and self._path == model_path
                and self._mtime == mtime
            ):
                return self._pipeline
            pipeline: Pipeline = joblib.load(model_path)
            self._path = model_path
            self._mtime = mtime
            self._pipeline = pipeline
            return pipeline

    def invalidate(self) -> None:
        with self._lock:
            self._path = None
            self._mtime = None
            self._pipeline = None


_model_cache = _ModelCache()


def _load_and_predict(model_path: Path, rows: list[dict[str, Any]]) -> tuple[Any, Any]:
    """CPU/IO-bound: load the (cached) model and score *rows*. Runs in a worker thread."""
    pipeline = _model_cache.load(model_path)
    predicted_ids = pipeline.predict(rows)
    confidence_scores = pipeline.predict_proba(rows).max(axis=1)
    return predicted_ids, confidence_scores


async def _recurring_payee_keys(session: AsyncSession) -> set[tuple[int, str]]:
    result = await session.execute(
        select(RecurringPattern.account_id, RecurringPattern.payee).where(
            RecurringPattern.is_active.is_(True)  # type: ignore[attr-defined]
        )
    )
    return {(account_id, payee) for account_id, payee in result.all()}


async def _get_or_create_state(session: AsyncSession) -> MLModelState:
    state = await session.get(MLModelState, _STATE_ID)
    if state is None:
        state = MLModelState(id=_STATE_ID)
        session.add(state)
        await session.commit()
        await session.refresh(state)
    return state


async def train(session: AsyncSession) -> TrainResult:
    """Query categorized transactions, fit ML pipeline, persist to disk."""
    result = await session.execute(
        select(Transaction).where(
            Transaction.category_id.isnot(None),  # type: ignore[union-attr]
            _not_split(),
        )
    )
    transactions = list(result.scalars().all())

    if len(transactions) < MIN_SAMPLES:
        raise ColdStartError(
            f"Need at least {MIN_SAMPLES} categorized transactions to train "
            f"(found {len(transactions)})"
        )

    recurring_keys = await _recurring_payee_keys(session)
    rows = [_feature_row(tx, recurring_keys) for tx in transactions]
    labels = [tx.category_id for tx in transactions]

    if len(set(labels)) < 2:
        # A classifier needs >=2 classes to discriminate between; this is
        # distinct from the sample-count check above (e.g. 50 transactions
        # that are all "Groceries" still can't train a useful model yet).
        raise ColdStartError(
            "Need categorized transactions in at least 2 different categories to "
            "train a model"
        )

    cv_accuracy = await run_in_threadpool(
        _fit_score_and_save, rows, labels, _model_path()
    )
    _model_cache.invalidate()

    state = await _get_or_create_state(session)
    state.categorizations_since_train = 0
    state.last_trained_at = datetime.now(timezone.utc)
    session.add(state)
    await session.commit()

    num_categories = len(set(labels))
    logger.info(
        "ml_categorization.train: trained on %d samples, %d categories, cv_accuracy=%s",
        len(transactions),
        num_categories,
        cv_accuracy,
    )
    return TrainResult(
        num_samples=len(transactions),
        num_categories=num_categories,
        cv_accuracy=cv_accuracy,
    )


async def note_manual_categorization(session: AsyncSession) -> None:
    """Bump the retrain counter after a manual (PATCH) categorization.

    Once `RETRAIN_AFTER_N_CATEGORIZATIONS` have accumulated since the last
    train, retrains right away (sub-second on a personal dataset per #127).
    """
    state = await _get_or_create_state(session)
    state.categorizations_since_train += 1
    due = state.categorizations_since_train >= RETRAIN_AFTER_N_CATEGORIZATIONS
    session.add(state)
    await session.commit()

    if due:
        try:
            await train(session)
        except ColdStartError:
            logger.info(
                "ml_categorization: auto-retrain skipped, not enough categorized "
                "transactions yet"
            )


async def maybe_retrain_after_import(session: AsyncSession) -> None:
    """Best-effort retrain right after a CSV import creates new rows.

    Unconditional (unlike the manual-categorization counter above) since an
    import is itself a natural point to refresh the model, and training is
    cheap at personal-finance scale.
    """
    try:
        await train(session)
    except ColdStartError:
        logger.info(
            "ml_categorization: post-import auto-retrain skipped, not enough "
            "categorized transactions yet"
        )


async def suggest(session: AsyncSession) -> list[Suggestion]:
    """Load trained model and return category suggestions for uncategorized transactions."""
    model_path = _model_path()
    if not model_path.exists():
        raise ColdStartError("No trained model found. Run /ml/train first.")

    # Load uncategorized transactions (excluding ones already resolved via splits)
    result = await session.execute(
        select(Transaction).where(
            Transaction.category_id.is_(None),  # type: ignore[union-attr]
            _not_split(),
        )
    )
    transactions = list(result.scalars().all())

    if not transactions:
        return []

    # Rules first: don't bother suggesting ML categories for transactions an
    # existing rule would already claim (e.g. added after the transaction
    # landed, before `POST /categorization-rules/apply` has run).
    rules = await load_rules_ordered(session)
    if rules:
        transactions = [
            tx for tx in transactions if match_transaction(tx, rules) is None
        ]
    if not transactions:
        return []

    # Load categories for name lookup
    cat_result = await session.execute(select(Category))
    categories = {cat.id: cat for cat in cat_result.scalars().all()}

    recurring_keys = await _recurring_payee_keys(session)
    rows = [_feature_row(tx, recurring_keys) for tx in transactions]
    predicted_ids, confidence_scores = await run_in_threadpool(
        _load_and_predict, model_path, rows
    )

    suggestions: list[Suggestion] = []
    for tx, cat_id, confidence in zip(transactions, predicted_ids, confidence_scores):
        if tx.id is None:
            continue
        cat = categories.get(cat_id)
        if cat is None:
            continue
        assert cat.id is not None
        suggestions.append(
            Suggestion(
                transaction_id=tx.id,
                category_id=cat.id,
                category_name=cat.name,
                confidence=float(confidence),
                payee=tx.payee,
                purpose=tx.purpose,
                amount=tx.amount,
                booking_date=tx.booking_date,
                could_become_rule=float(confidence)
                >= RULE_SUGGESTION_CONFIDENCE_THRESHOLD,
            )
        )

    logger.info(
        "ml_categorization.suggest: produced %d suggestions for %d uncategorized transactions",
        len(suggestions),
        len(transactions),
    )
    return suggestions
