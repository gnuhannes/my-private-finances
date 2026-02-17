from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import create_account, create_category, create_transaction


@pytest.mark.asyncio
async def test_reports_monthly_aggregates_correctly(test_app: AsyncClient) -> None:
    acc = await create_account(test_app, name="Main", currency="EUR")
    account_id = acc["id"]

    await create_transaction(
        test_app,
        account_id=account_id,
        booking_date="2026-02-03",
        amount="-12.34",
        currency="EUR",
        payee="REWE",
        purpose="Einkauf",
        import_source="manual",
        external_id="feb-1",
    )
    await create_transaction(
        test_app,
        account_id=account_id,
        booking_date="2026-02-04",
        amount="2500.00",
        currency="EUR",
        payee="Employer",
        purpose="Salary",
        import_source="manual",
        external_id="feb-2",
    )
    await create_transaction(
        test_app,
        account_id=account_id,
        booking_date="2026-01-15",
        amount="-99.99",
        currency="EUR",
        payee="AMAZON",
        purpose="Shopping",
        import_source="manual",
        external_id="jan-1",
    )

    res = await test_app.get(
        "/api/reports/monthly",
        params={"account_id": account_id, "month": "2026-02"},
    )
    assert res.status_code == 200, (
        f"Expected 200, got {res.status_code}. Response: {res.text}"
    )

    body = res.json()

    assert body["account_id"] == account_id, (
        f"account_id mismatch. Expected {account_id}, got {body['account_id']}. Body: {body}"
    )
    assert body["month"] == "2026-02", (
        f"month mismatch. Expected 2026-02, got {body['month']}. Body: {body}"
    )
    assert body["currency"] == "EUR", (
        f"currency mismatch. Expected EUR, got {body['currency']}. Body: {body}"
    )

    assert body["transactions_count"] == 2, (
        f"transactions_count mismatch. Expected 2, got {body['transactions_count']}. Body: {body}"
    )

    assert body["income_total"] == "2500.00", (
        f"income_total mismatch. Expected 2500.00, got {body['income_total']}. Body: {body}"
    )
    assert body["expense_total"] == "-12.34", (
        f"expense_total mismatch. Expected -12.34, got {body['expense_total']}. Body: {body}"
    )
    assert body["net_total"] == "2487.66", (
        f"net_total mismatch. Expected 2487.66, got {body['net_total']}. Body: {body}"
    )

    top_payees = body["top_payees"]
    assert isinstance(top_payees, list), (
        f"top_payees must be a list. Got {type(top_payees)}. Body: {body}"
    )

    payees = {p["payee"]: p for p in top_payees}
    assert "REWE" in payees, f"Expected payee 'REWE' in top_payees. Got: {top_payees}"
    assert payees["REWE"]["total"] == "-12.34", (
        f"REWE total mismatch. Expected -12.34, got {payees['REWE']['total']}. top_payees: {top_payees}"
    )

    # Uncategorized expense shows up in category_breakdown with null name
    cat_breakdown = body["category_breakdown"]
    assert len(cat_breakdown) == 1
    assert cat_breakdown[0]["category_name"] is None
    assert cat_breakdown[0]["total"] == "-12.34"


@pytest.mark.asyncio
async def test_reports_monthly_category_breakdown(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    cat_groceries = await create_category(test_app, name="Groceries")
    cat_transport = await create_category(test_app, name="Transport")

    # Two categorized expenses + one uncategorized
    tx1 = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-03-01",
        amount="-50.00",
        payee="REWE",
        external_id="cat-1",
    )
    await test_app.patch(
        f"/api/transactions/{tx1['id']}",
        json={"category_id": cat_groceries["id"]},
    )

    tx2 = await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-03-05",
        amount="-30.00",
        payee="DB",
        external_id="cat-2",
    )
    await test_app.patch(
        f"/api/transactions/{tx2['id']}",
        json={"category_id": cat_transport["id"]},
    )

    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-03-10",
        amount="-15.00",
        payee="Unknown",
        external_id="cat-3",
    )

    # Income should not appear in breakdown
    await create_transaction(
        test_app,
        account_id=acc["id"],
        booking_date="2026-03-15",
        amount="3000.00",
        payee="Employer",
        external_id="cat-4",
    )

    res = await test_app.get(
        "/api/reports/monthly",
        params={"account_id": acc["id"], "month": "2026-03"},
    )
    assert res.status_code == 200
    body = res.json()

    breakdown = body["category_breakdown"]
    assert len(breakdown) == 3

    by_name = {c["category_name"]: c["total"] for c in breakdown}
    assert by_name["Groceries"] == "-50.00"
    assert by_name["Transport"] == "-30.00"
    assert by_name[None] == "-15.00"

    # Ordered by total ascending (most spending first)
    assert breakdown[0]["category_name"] == "Groceries"
    assert breakdown[1]["category_name"] == "Transport"


@pytest.mark.asyncio
async def test_reports_monthly_invalid_month_returns_422(test_app: AsyncClient) -> None:
    acc = await create_account(test_app)
    account_id = acc["id"]

    res = await test_app.get(
        "/api/reports/monthly",
        params={"account_id": account_id, "month": "2026-13"},
    )
    assert res.status_code == 422, (
        f"Expected 422, got {res.status_code}. Response: {res.text}"
    )
