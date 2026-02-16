from pathlib import Path

import pytest
from httpx import AsyncClient

from my_private_finances.services.csv_import import import_transactions_from_csv_path
from tests.helpers import create_account, create_category, create_rule


@pytest.mark.asyncio
async def test_csv_import_auto_categorizes_matching_transactions(
    test_app: AsyncClient, tmp_path: Path
) -> None:
    account = await create_account(test_app)
    cat = await create_category(test_app, name="Groceries")
    await create_rule(
        test_app,
        field="payee",
        operator="contains",
        value="Rewe",
        category_id=cat["id"],
    )

    csv_content = (
        "booking_date,amount,currency,payee,purpose,external_id\n"
        "2026-01-15,42.00,EUR,REWE Supermarkt,Weekly groceries,autocat-1\n"
        "2026-01-16,15.00,EUR,Aldi Nord,Snacks,autocat-2\n"
    )
    csv_file = tmp_path / "import.csv"
    csv_file.write_text(csv_content, encoding="utf-8")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        result = await import_transactions_from_csv_path(
            session=session,
            account_id=account["id"],
            csv_path=csv_file,
        )

    assert result.created == 2

    # Check transactions — REWE should be categorized, Aldi should not
    tx_res = await test_app.get(f"/api/transactions?account_id={account['id']}")
    items = tx_res.json()["items"]
    by_payee = {item["payee"]: item for item in items}

    assert by_payee["REWE Supermarkt"]["category_id"] == cat["id"]
    assert by_payee["Aldi Nord"]["category_id"] is None


@pytest.mark.asyncio
async def test_csv_import_without_rules_leaves_uncategorized(
    test_app: AsyncClient, tmp_path: Path
) -> None:
    account = await create_account(test_app)

    csv_content = (
        "booking_date,amount,currency,payee,purpose,external_id\n"
        "2026-01-15,42.00,EUR,REWE,Groceries,nocat-1\n"
    )
    csv_file = tmp_path / "import.csv"
    csv_file.write_text(csv_content, encoding="utf-8")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        result = await import_transactions_from_csv_path(
            session=session,
            account_id=account["id"],
            csv_path=csv_file,
        )

    assert result.created == 1

    tx_res = await test_app.get(f"/api/transactions?account_id={account['id']}")
    items = tx_res.json()["items"]
    assert items[0]["category_id"] is None
