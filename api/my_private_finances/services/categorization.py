from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from my_private_finances.models import CategorizationRule, Transaction

logger = logging.getLogger(__name__)


def match_transaction(tx: Transaction, rules: list[CategorizationRule]) -> int | None:
    """Return category_id of the first matching rule, or None.

    Rules must be pre-sorted by position (ascending).
    """
    for rule in rules:
        if _matches(tx, rule):
            return rule.category_id
    return None


def _matches(tx: Transaction, rule: CategorizationRule) -> bool:
    if rule.field == "amount":
        return _match_amount(tx.amount, rule.operator, rule.value)

    text_value = _get_text_field(tx, rule.field)
    if text_value is None:
        return False
    return _match_text(text_value, rule.operator, rule.value)


def _get_text_field(tx: Transaction, field: str) -> str | None:
    if field == "payee":
        return tx.payee
    if field == "purpose":
        return tx.purpose
    return None


def _match_text(text: str, operator: str, value: str) -> bool:
    t = text.lower()
    v = value.lower()
    if operator == "contains":
        return v in t
    if operator == "exact":
        return t == v
    if operator == "starts_with":
        return t.startswith(v)
    if operator == "ends_with":
        return t.endswith(v)
    return False


def _match_amount(amount: Decimal, operator: str, value: str) -> bool:
    try:
        threshold = Decimal(value)
    except InvalidOperation:
        return False

    if operator == "eq":
        return amount == threshold
    if operator == "gt":
        return amount > threshold
    if operator == "lt":
        return amount < threshold
    if operator == "gte":
        return amount >= threshold
    if operator == "lte":
        return amount <= threshold
    return False


async def load_rules_ordered(session: AsyncSession) -> list[CategorizationRule]:
    """Load all rules ordered by position (ascending)."""
    result = await session.execute(
        select(CategorizationRule).order_by(CategorizationRule.position)  # type: ignore[arg-type]
    )
    return list(result.scalars().all())


async def apply_rules_to_uncategorized(session: AsyncSession) -> int:
    """Apply rules to ALL uncategorized transactions. Returns count categorized."""
    rules = await load_rules_ordered(session)
    if not rules:
        return 0

    result = await session.execute(
        select(Transaction).where(Transaction.category_id.is_(None))  # type: ignore[union-attr]
    )
    transactions = list(result.scalars().all())

    categorized = 0
    for tx in transactions:
        category_id = match_transaction(tx, rules)
        if category_id is not None:
            tx.category_id = category_id
            categorized += 1

    if categorized > 0:
        await session.commit()

    logger.info(
        "apply_rules_to_uncategorized: categorized %d of %d uncategorised transactions",
        categorized,
        len(transactions),
    )
    return categorized
