from typing import Any

from httpx import AsyncClient


async def create_account(
    client: AsyncClient, *, name: str = "Main", currency: str = "EUR"
) -> dict[str, Any]:
    response = await client.post(
        "/accounts",
        json={
            "name": name,
            "currency": currency,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_transaction(
    client: AsyncClient,
    *,
    account_id: int,
    booking_date: str = "2026-01-18",
    amount: str = "12.34",
    currency: str = "EUR",
    payee: str = "Rewe",
    purpose: str = "Groceries",
    import_source: str = "manual",
    external_id: str = "abc-1",
) -> dict[str, Any]:
    payload = {
        "account_id": account_id,
        "booking_date": booking_date,
        "amount": amount,
        "currency": currency,
        "payee": payee,
        "purpose": purpose,
        "import_source": import_source,
        "external_id": external_id,
    }

    response = await client.post("/transactions", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
