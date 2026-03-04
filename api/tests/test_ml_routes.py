from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from my_private_finances.models import Transaction
from tests.helpers import create_account, create_category


@pytest.mark.asyncio
async def test_train_endpoint_cold_start_returns_400(test_app: AsyncClient) -> None:
    response = await test_app.post("/api/ml/train")
    assert response.status_code == 400
    assert "categorized" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_train_and_suggest_flow(test_app: AsyncClient, tmp_path: Path) -> None:
    account = await create_account(test_app)
    cat1 = await create_category(test_app, name="Groceries")
    cat2 = await create_category(test_app, name="Transport")

    session_factory = test_app._transport.app.state.session_factory  # type: ignore[union-attr]
    async with session_factory() as session:
        for i in range(6):
            session.add(
                Transaction(
                    account_id=account["id"],
                    booking_date=date(2026, 1, i + 1),
                    amount=Decimal("10.00"),
                    currency="EUR",
                    payee="REWE",
                    purpose="Groceries",
                    category_id=cat1["id"],
                    import_hash=f"hash-g{i}",
                )
            )
        for i in range(6):
            session.add(
                Transaction(
                    account_id=account["id"],
                    booking_date=date(2026, 1, i + 1),
                    amount=Decimal("5.00"),
                    currency="EUR",
                    payee="BVG",
                    purpose="Transport ticket",
                    category_id=cat2["id"],
                    import_hash=f"hash-t{i}",
                )
            )
        # Uncategorized transaction to get a suggestion for
        session.add(
            Transaction(
                account_id=account["id"],
                booking_date=date(2026, 2, 1),
                amount=Decimal("25.00"),
                currency="EUR",
                payee="REWE Markt",
                purpose="Lebensmittel",
                category_id=None,
                import_hash="hash-uncat",
            )
        )
        await session.commit()

    model_path = tmp_path / "ml_model.joblib"
    with patch(
        "my_private_finances.services.ml_categorization._model_path",
        return_value=model_path,
    ):
        train_resp = await test_app.post("/api/ml/train")
        assert train_resp.status_code == 200
        body = train_resp.json()
        assert body["num_samples"] == 12
        assert body["num_categories"] == 2

        suggest_resp = await test_app.get("/api/ml/suggest")
        assert suggest_resp.status_code == 200
        suggestions = suggest_resp.json()
        assert len(suggestions) == 1
        s = suggestions[0]
        assert "transaction_id" in s
        assert "category_id" in s
        assert "confidence" in s
        assert 0.0 <= s["confidence"] <= 1.0
