import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_transaction_unknown_account_returns_404(
    test_app: AsyncClient,
) -> None:
    payload = {
        "account_id": 9999999,
        "booking_date": "2026-01-18",
        "amount": "12.34",
        "currency": "EUR",
        "payee": "Rewe",
        "purpose": "Groceries",
        "import_source": "manual",
        "external_id": "abc-1",
    }

    res = await test_app.post("/api/transactions", json=payload)
    assert res.status_code == 404, res.text
    assert res.json()["detail"] == "Account not found"
