import pytest
from httpx import AsyncClient

from tests.helpers import (
    create_account,
    create_category,
    create_rule,
    create_transaction,
)


@pytest.mark.asyncio
async def test_apply_rules_categorizes_uncategorized_transactions(
    test_app: AsyncClient,
) -> None:
    cat = await create_category(test_app, name="Groceries")
    account = await create_account(test_app)
    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Rewe",
        category_id=cat["id"],
    )

    # Create uncategorized transaction
    await create_transaction(
        test_app,
        account_id=account["id"],
        payee="REWE Supermarkt",
        external_id="apply-1",
    )

    # Apply rules
    res = await test_app.post("/api/categorization-rules/apply")
    assert res.status_code == 200
    assert res.json()["categorized"] == 1

    # Verify transaction is now categorized
    tx_res = await test_app.get(f"/api/transactions?account_id={account['id']}")
    items = tx_res.json()["items"]
    assert items[0]["category_id"] == cat["id"]


@pytest.mark.asyncio
async def test_apply_rules_skips_already_categorized(
    test_app: AsyncClient,
) -> None:
    cat1 = await create_category(test_app, name="Groceries")
    cat2 = await create_category(test_app, name="Shopping")
    account = await create_account(test_app)
    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Rewe",
        category_id=cat2["id"],
    )

    # Create already-categorized transaction
    payload = {
        "account_id": account["id"],
        "booking_date": "2026-01-18",
        "amount": "10.00",
        "currency": "EUR",
        "payee": "REWE Supermarkt",
        "purpose": "Groceries",
        "import_source": "manual",
        "external_id": "apply-2",
        "category_id": cat1["id"],
    }
    await test_app.post("/api/transactions", json=payload)

    res = await test_app.post("/api/categorization-rules/apply")
    assert res.json()["categorized"] == 0


@pytest.mark.asyncio
async def test_apply_rules_no_rules_returns_zero(test_app: AsyncClient) -> None:
    res = await test_app.post("/api/categorization-rules/apply")
    assert res.json()["categorized"] == 0


@pytest.mark.asyncio
async def test_apply_rules_first_match_wins(test_app: AsyncClient) -> None:
    cat1 = await create_category(test_app, name="Groceries")
    cat2 = await create_category(test_app, name="Shopping")
    account = await create_account(test_app)

    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Rewe",
        category_id=cat1["id"],
    )
    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Supermarkt",
        category_id=cat2["id"],
    )

    await create_transaction(
        test_app,
        account_id=account["id"],
        payee="REWE Supermarkt",
        external_id="apply-3",
    )

    res = await test_app.post("/api/categorization-rules/apply")
    assert res.json()["categorized"] == 1

    tx_res = await test_app.get(f"/api/transactions?account_id={account['id']}")
    assert tx_res.json()["items"][0]["category_id"] == cat1["id"]
