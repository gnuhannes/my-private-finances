from typing import Any, Optional

from httpx import AsyncClient

API_PREFIX = "/api"


async def create_category(
    client: AsyncClient,
    *,
    name: str = "Groceries",
    parent_id: Optional[int] = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"name": name}
    if parent_id is not None:
        payload["parent_id"] = parent_id

    response = await client.post(f"{API_PREFIX}/categories", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def create_rule(
    client: AsyncClient,
    *,
    field: str = "payee",
    operator: str = "contains",
    value: str = "Rewe",
    category_id: int,
) -> dict[str, Any]:
    payload = {
        "field": field,
        "operator": operator,
        "value": value,
        "category_id": category_id,
    }
    response = await client.post(f"{API_PREFIX}/categorization-rules", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def create_account(
    client: AsyncClient, *, name: str = "Main", currency: str = "EUR"
) -> dict[str, Any]:
    response = await client.post(
        f"{API_PREFIX}/accounts",
        json={
            "name": name,
            "currency": currency,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_budget(
    client: AsyncClient,
    *,
    category_id: int,
    amount: str = "300.00",
) -> dict[str, Any]:
    payload = {"category_id": category_id, "amount": amount}
    response = await client.post(f"{API_PREFIX}/budgets", json=payload)
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

    response = await client.post(f"{API_PREFIX}/transactions", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
