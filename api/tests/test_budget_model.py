"""Direct model/schema tests for budget coverage."""

from decimal import Decimal

import pytest

from my_private_finances.models.budget import Budget
from my_private_finances.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate
from my_private_finances.schemas.report_budget import BudgetComparison


def test_budget_model_fields() -> None:
    b = Budget(category_id=1, amount=Decimal("300.00"))
    assert b.category_id == 1
    assert b.amount == Decimal("300.00")
    assert b.id is None


def test_budget_create_schema() -> None:
    bc = BudgetCreate(category_id=1, amount=Decimal("300.00"))
    assert bc.category_id == 1
    assert bc.amount == Decimal("300.00")


def test_budget_create_rejects_zero() -> None:
    with pytest.raises(Exception):
        BudgetCreate(category_id=1, amount=Decimal("0"))


def test_budget_update_schema() -> None:
    bu = BudgetUpdate(amount=Decimal("500.00"))
    assert bu.amount == Decimal("500.00")


def test_budget_read_schema() -> None:
    br = BudgetRead(
        id=1,
        category_id=1,
        category_name="Groceries",
        amount=Decimal("300.00"),
    )
    assert br.category_name == "Groceries"


def test_budget_comparison_schema() -> None:
    bc = BudgetComparison(
        category_id=1,
        category_name="Groceries",
        budgeted=Decimal("300.00"),
        actual=Decimal("250.00"),
        remaining=Decimal("50.00"),
    )
    assert bc.remaining == Decimal("50.00")


def test_budget_comparison_negative_remaining() -> None:
    bc = BudgetComparison(
        category_id=1,
        category_name="Transport",
        budgeted=Decimal("100.00"),
        actual=Decimal("120.00"),
        remaining=Decimal("-20.00"),
    )
    assert bc.remaining < 0
