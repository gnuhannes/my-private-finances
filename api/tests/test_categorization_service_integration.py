from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient

from my_private_finances.models import CategorizationRule, Transaction
from my_private_finances.services.categorization import apply_rules_to_uncategorized
from tests.helpers import create_account, create_category


@pytest.mark.asyncio
async def test_apply_rules_to_uncategorized_categorizes_matching(
    test_app: AsyncClient,
) -> None:
    account = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        # Create a rule
        rule = CategorizationRule(
            position=1,
            field="payee",
            operator="contains",
            value="Rewe",
            category_id=cat["id"],
        )
        session.add(rule)

        # Create uncategorized transaction
        tx = Transaction(
            account_id=account["id"],
            booking_date=date(2026, 1, 15),
            amount=Decimal("42.00"),
            currency="EUR",
            payee="REWE Supermarkt",
            purpose="Groceries",
            category_id=None,
            import_hash="service-test-1",
        )
        session.add(tx)
        await session.commit()

        count = await apply_rules_to_uncategorized(session)
        assert count == 1


@pytest.mark.asyncio
async def test_apply_rules_to_uncategorized_no_rules_returns_zero(
    test_app: AsyncClient,
) -> None:
    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        count = await apply_rules_to_uncategorized(session)
        assert count == 0


@pytest.mark.asyncio
async def test_apply_rules_skips_already_categorized_transactions(
    test_app: AsyncClient,
) -> None:
    account = await create_account(test_app)
    cat1 = await create_category(test_app, name="Groceries")
    cat2 = await create_category(test_app, name="Shopping")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        rule = CategorizationRule(
            position=1,
            field="payee",
            operator="contains",
            value="Rewe",
            category_id=cat2["id"],
        )
        session.add(rule)

        # Already categorized — should not change
        tx = Transaction(
            account_id=account["id"],
            booking_date=date(2026, 1, 15),
            amount=Decimal("42.00"),
            currency="EUR",
            payee="REWE Supermarkt",
            purpose="Groceries",
            category_id=cat1["id"],
            import_hash="service-test-2",
        )
        session.add(tx)
        await session.commit()

        count = await apply_rules_to_uncategorized(session)
        assert count == 0
