"""Model and schema tests for RecurringPattern."""

from datetime import date
from decimal import Decimal

from my_private_finances.models import RecurringPattern
from my_private_finances.schemas import (
    FrequencyTotal,
    RecurringPatternRead,
    RecurringPatternUpdate,
    RecurringSummary,
)


def test_recurring_pattern_model_fields() -> None:
    p = RecurringPattern(
        account_id=1,
        payee="Netflix",
        typical_amount=Decimal("12.99"),
        frequency="monthly",
        confidence=Decimal("0.85"),
        last_seen=date(2026, 6, 5),
        occurrence_count=6,
    )
    assert p.account_id == 1
    assert p.payee == "Netflix"
    assert p.is_active is True
    assert p.user_confirmed is False
    assert p.id is None


def test_recurring_pattern_read_schema() -> None:
    r = RecurringPatternRead(
        id=1,
        account_id=1,
        payee="Netflix",
        typical_amount=Decimal("12.99"),
        frequency="monthly",
        confidence=Decimal("0.85"),
        last_seen=date(2026, 6, 5),
        occurrence_count=6,
        is_active=True,
        user_confirmed=False,
        category_name="Entertainment",
    )
    assert r.payee == "Netflix"
    assert r.category_name == "Entertainment"


def test_recurring_pattern_update_schema() -> None:
    u = RecurringPatternUpdate(is_active=False)
    assert u.is_active is False
    assert u.user_confirmed is None


def test_recurring_summary_schema() -> None:
    s = RecurringSummary(
        account_id=1,
        total_monthly_recurring=Decimal("45.97"),
        pattern_count=3,
        by_frequency=[
            FrequencyTotal(frequency="monthly", count=2, total=Decimal("25.98")),
            FrequencyTotal(frequency="weekly", count=1, total=Decimal("19.99")),
        ],
    )
    assert s.pattern_count == 3
    assert len(s.by_frequency) == 2
